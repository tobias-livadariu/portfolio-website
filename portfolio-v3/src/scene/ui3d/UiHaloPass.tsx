import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type {
  Camera,
  Material,
  Object3D,
  Scene,
  WebGLRenderer,
} from "three";
import {
  Color,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  RGBAFormat,
  ShaderMaterial,
  Uniform,
  Vector2,
  WebGLRenderTarget,
} from "three";
import {
  FullScreenQuad,
  Pass,
} from "three/examples/jsm/postprocessing/Pass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UI_HALO } from "./main-menu.constants";

type RenderableObject = Object3D & {
  isMesh?: boolean;
  isSprite?: boolean;
  material?: Material | Material[];
};

interface RenderableSnapshot {
  material?: Material | Material[];
  object: RenderableObject;
  visible: boolean;
}

type MaskMaterialGetter = (object: Object3D) => MeshBasicMaterial;

function createHaloMaterial(maskTexture: WebGLRenderTarget["texture"]) {
  return new ShaderMaterial({
    uniforms: {
      backgroundColor: new Uniform(new Color(UI_HALO.backgroundColor)),
      expandedMaskEnd: new Uniform(UI_HALO.expandedMaskEnd),
      expandedMaskStart: new Uniform(UI_HALO.expandedMaskStart),
      haloColor: new Uniform(new Color(UI_HALO.color)),
      inputTexture: new Uniform(null),
      maskTexture: new Uniform(maskTexture),
      opacity: new Uniform(UI_HALO.opacity),
      outputAlpha: new Uniform(UI_HALO.outputAlpha),
      radiusPx: new Uniform(UI_HALO.radiusPx),
      texelSize: new Uniform(new Vector2(1, 1)),
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      #define MAX_SAMPLE_RADIUS ${UI_HALO.maxSampleRadiusPx}

      uniform vec3 haloColor;
      uniform vec3 backgroundColor;
      uniform sampler2D inputTexture;
      uniform sampler2D maskTexture;
      uniform float expandedMaskEnd;
      uniform float expandedMaskStart;
      uniform float opacity;
      uniform float outputAlpha;
      uniform float radiusPx;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        vec4 sceneColor = texture2D(inputTexture, vUv);
        sceneColor.rgb = mix(backgroundColor, sceneColor.rgb, sceneColor.a);
        float center = texture2D(maskTexture, vUv).r;
        float neighbor = 0.0;

        for (int y = -MAX_SAMPLE_RADIUS; y <= MAX_SAMPLE_RADIUS; y++) {
          for (int x = -MAX_SAMPLE_RADIUS; x <= MAX_SAMPLE_RADIUS; x++) {
            vec2 pixelOffset = vec2(float(x), float(y));
            float distanceFromCenter = length(pixelOffset);

            if (distanceFromCenter > 0.0 && distanceFromCenter <= radiusPx) {
              vec2 sampleUv = vUv + pixelOffset * texelSize;
              vec4 sampleValue = texture2D(maskTexture, sampleUv);
              float sampleMask = sampleValue.r;

              if (sampleMask > 0.0) {
                float radiusScale = clamp(
                  sampleValue.g / max(sampleMask, 0.0001),
                  0.0,
                  1.0
                );

                if (distanceFromCenter <= radiusPx * radiusScale) {
                  neighbor = max(neighbor, sampleMask);
                }
              }
            }
          }
        }

        float expandedMask = smoothstep(
          expandedMaskStart,
          expandedMaskEnd,
          max(neighbor, center)
        );
        float halo = expandedMask * opacity;

        gl_FragColor = vec4(mix(sceneColor.rgb, haloColor, halo), outputAlpha);
      }
    `,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function isVisibleMaterial(material: Material | undefined) {
  if (!material || !material.visible) {
    return false;
  }

  const materialWithOpacity = material as Material & {
    opacity?: number;
    transparent?: boolean;
  };

  return !(
    materialWithOpacity.transparent &&
    typeof materialWithOpacity.opacity === "number" &&
    materialWithOpacity.opacity <= 0.001
  );
}

function isRenderableObject(object: Object3D): object is RenderableObject {
  const renderable = object as RenderableObject;
  return Boolean(renderable.isMesh || renderable.isSprite);
}

function shouldMaskObject(object: Object3D) {
  if (object.userData[UI_HALO.skipUserDataKey] || !object.visible) {
    return false;
  }

  if (!isRenderableObject(object)) {
    return false;
  }

  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  return materials.some(isVisibleMaterial);
}

function collectMaskTargets(root: Object3D, targets: Object3D[]) {
  targets.length = 0;

  root.traverse((object) => {
    if (object !== root && shouldMaskObject(object)) {
      targets.push(object);
    }
  });
}

function applyMaskSceneState(
  scene: Object3D,
  targets: Set<Object3D>,
  getMaskMaterial: MaskMaterialGetter,
  snapshots: RenderableSnapshot[],
) {
  snapshots.length = 0;

  scene.traverse((object) => {
    if (!isRenderableObject(object)) {
      return;
    }

    snapshots.push({
      material: object.material,
      object,
      visible: object.visible,
    });

    if (targets.has(object)) {
      object.visible = true;
      object.material = getMaskMaterial(object);
    } else {
      object.visible = false;
    }
  });
}

function applyVisibilitySceneState(
  scene: Object3D,
  visibleTargets: Set<Object3D>,
  snapshots: RenderableSnapshot[],
) {
  snapshots.length = 0;

  scene.traverse((object) => {
    if (!isRenderableObject(object)) {
      return;
    }

    snapshots.push({
      material: object.material,
      object,
      visible: object.visible,
    });

    object.visible = visibleTargets.has(object);
  });
}

function restoreSceneState(snapshots: RenderableSnapshot[]) {
  snapshots.forEach(({ material, object, visible }) => {
    object.visible = visible;

    if (material) {
      object.material = material;
    }
  });

  snapshots.length = 0;
}

class UiSceneRenderPass extends Pass {
  private readonly clearSceneColor = new Color(UI_HALO.sceneClearColor);
  private readonly clearColor = new Color();
  private readonly renderCamera: Camera;
  private readonly renderScene: Scene;

  constructor(renderScene: Scene, renderCamera: Camera) {
    super();

    this.clear = true;
    this.needsSwap = false;
    this.renderScene = renderScene;
    this.renderCamera = renderCamera;
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ) {
    const previousBackground = this.renderScene.background;
    const previousClearAlpha = renderer.getClearAlpha();
    const uiRoot = this.renderScene.getObjectByName(UI_HALO.rootName);
    const previousRootVisible = uiRoot?.visible;

    renderer.getClearColor(this.clearColor);
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.setClearColor(this.clearSceneColor, UI_HALO.sceneClearAlpha);
    this.renderScene.background = null;

    try {
      if (uiRoot) {
        uiRoot.visible = false;
      }

      renderer.clear(true, true, true);
      renderer.render(this.renderScene, this.renderCamera);
    } finally {
      if (uiRoot && previousRootVisible !== undefined) {
        uiRoot.visible = previousRootVisible;
      }

      this.renderScene.background = previousBackground;
      renderer.setClearColor(this.clearColor, previousClearAlpha);
    }
  }
}

class UiHaloCompositePass extends Pass {
  private readonly clearColor = new Color();
  private readonly haloMaterial: ShaderMaterial;
  private readonly maskMaterials = new Map<number, MeshBasicMaterial>();
  private readonly maskTarget: WebGLRenderTarget;
  private readonly quad: FullScreenQuad;
  private readonly renderCamera: Camera;
  private readonly renderScene: Scene;
  private readonly selectedObjects: Object3D[];
  private readonly snapshots: RenderableSnapshot[] = [];

  constructor(
    renderScene: Scene,
    renderCamera: Camera,
    selectedObjects: Object3D[],
  ) {
    super();

    this.renderScene = renderScene;
    this.renderCamera = renderCamera;
    this.selectedObjects = selectedObjects;
    this.maskTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      format: RGBAFormat,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      samples: UI_HALO.multisampleCount,
      stencilBuffer: false,
    });
    this.haloMaterial = createHaloMaterial(this.maskTarget.texture);
    this.quad = new FullScreenQuad(this.haloMaterial);
    this.needsSwap = true;
  }

  override setSize(width: number, height: number) {
    const maskWidth = Math.max(1, Math.round(width * UI_HALO.resolutionScale));
    const maskHeight = Math.max(
      1,
      Math.round(height * UI_HALO.resolutionScale),
    );

    this.maskTarget.setSize(maskWidth, maskHeight);
    this.haloMaterial.uniforms.texelSize.value.set(
      1 / maskWidth,
      1 / maskHeight,
    );
    this.haloMaterial.uniforms.radiusPx.value =
      UI_HALO.radiusPx * UI_HALO.resolutionScale;
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ) {
    const targetSet = new Set(this.selectedObjects);
    const previousBackground = this.renderScene.background;
    const previousClearAlpha = renderer.getClearAlpha();

    renderer.getClearColor(this.clearColor);
    this.renderScene.background = null;

    applyMaskSceneState(
      this.renderScene,
      targetSet,
      this.getMaskMaterial,
      this.snapshots,
    );

    try {
      renderer.setRenderTarget(this.maskTarget);
      renderer.setClearColor(UI_HALO.maskClearColor, UI_HALO.maskClearAlpha);
      renderer.clear(true, true, true);
      renderer.render(this.renderScene, this.renderCamera);
    } finally {
      restoreSceneState(this.snapshots);
      this.renderScene.background = previousBackground;
      renderer.setClearColor(this.clearColor, previousClearAlpha);
    }

    this.haloMaterial.uniforms.inputTexture.value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    if (this.clear) {
      renderer.clear(
        renderer.autoClearColor,
        renderer.autoClearDepth,
        renderer.autoClearStencil,
      );
    }

    this.quad.render(renderer);
    this.renderUiOverlay(renderer, targetSet);
  }

  private getMaskMaterial = (object: Object3D) => {
    const radiusScale = this.getHaloRadiusScale(object);
    const cachedMaterial = this.maskMaterials.get(radiusScale);

    if (cachedMaterial) {
      return cachedMaterial;
    }

    const maskColor = new Color(UI_HALO.maskColor);
    maskColor.g = radiusScale;

    const material = new MeshBasicMaterial({
      color: maskColor,
      depthTest: true,
      depthWrite: true,
      side: DoubleSide,
      toneMapped: false,
    });

    this.maskMaterials.set(radiusScale, material);

    return material;
  };

  private getHaloRadiusScale(object: Object3D) {
    const radiusScale = object.userData[UI_HALO.radiusScaleUserDataKey];

    if (typeof radiusScale !== "number" || !Number.isFinite(radiusScale)) {
      return 1;
    }

    return Math.min(1, Math.max(0, radiusScale));
  }

  private renderUiOverlay(
    renderer: WebGLRenderer,
    visibleTargets: Set<Object3D>,
  ) {
    const previousAutoClear = renderer.autoClear;
    const previousBackground = this.renderScene.background;

    renderer.clearDepth();
    renderer.autoClear = false;
    this.renderScene.background = null;
    applyVisibilitySceneState(
      this.renderScene,
      visibleTargets,
      this.snapshots,
    );

    try {
      renderer.render(this.renderScene, this.renderCamera);
    } finally {
      restoreSceneState(this.snapshots);
      this.renderScene.background = previousBackground;
      renderer.autoClear = previousAutoClear;
    }
  }

  override dispose() {
    this.quad.dispose();
    this.haloMaterial.dispose();
    this.maskMaterials.forEach((material) => {
      material.dispose();
    });
    this.maskMaterials.clear();
    this.maskTarget.dispose();
  }
}

export default function UiHaloPass() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const haloPassRef = useRef<UiHaloCompositePass | null>(null);
  const maskTargetsRef = useRef<Object3D[]>([]);

  useLayoutEffect(() => {
    const selectedObjects = maskTargetsRef.current;
    const composer = new EffectComposer(gl);
    const haloPass = new UiHaloCompositePass(scene, camera, selectedObjects);
    const smaaPass = UI_HALO.smaaEnabled ? new SMAAPass() : null;
    const outputPass = new OutputPass();

    composer.addPass(new UiSceneRenderPass(scene, camera));
    composer.addPass(haloPass);
    if (smaaPass) {
      composer.addPass(smaaPass);
    }
    composer.addPass(outputPass);

    composerRef.current = composer;
    haloPassRef.current = haloPass;

    return () => {
      selectedObjects.length = 0;
      composerRef.current = null;
      haloPassRef.current = null;
      composer.dispose();
      haloPass.dispose();
      smaaPass?.dispose();
      outputPass.dispose();
    };
  }, [camera, gl, scene]);

  useLayoutEffect(() => {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [gl, size.height, size.width]);

  useFrame((_, delta) => {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    const root = scene.getObjectByName(UI_HALO.rootName);

    if (root) {
      collectMaskTargets(root, maskTargetsRef.current);
    } else {
      maskTargetsRef.current.length = 0;
    }

    composer.render(delta);
  }, 1);

  return null;
}
