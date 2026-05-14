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
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
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

function createHaloMaterial(maskTexture: WebGLRenderTarget["texture"]) {
  return new ShaderMaterial({
    uniforms: {
      expandedMaskEnd: new Uniform(UI_HALO.expandedMaskEnd),
      expandedMaskStart: new Uniform(UI_HALO.expandedMaskStart),
      haloColor: new Uniform(new Color(UI_HALO.color)),
      inputTexture: new Uniform(null),
      maskTexture: new Uniform(maskTexture),
      opacity: new Uniform(UI_HALO.opacity),
      outputAlpha: new Uniform(UI_HALO.outputAlpha),
      radiusPx: new Uniform(UI_HALO.radiusPx),
      solidMaskEnd: new Uniform(UI_HALO.solidMaskEnd),
      solidMaskStart: new Uniform(UI_HALO.solidMaskStart),
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
      uniform sampler2D inputTexture;
      uniform sampler2D maskTexture;
      uniform float expandedMaskEnd;
      uniform float expandedMaskStart;
      uniform float opacity;
      uniform float outputAlpha;
      uniform float radiusPx;
      uniform float solidMaskEnd;
      uniform float solidMaskStart;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        vec4 sceneColor = texture2D(inputTexture, vUv);
        float center = texture2D(maskTexture, vUv).r;
        float neighbor = 0.0;

        for (int y = -MAX_SAMPLE_RADIUS; y <= MAX_SAMPLE_RADIUS; y++) {
          for (int x = -MAX_SAMPLE_RADIUS; x <= MAX_SAMPLE_RADIUS; x++) {
            vec2 pixelOffset = vec2(float(x), float(y));
            float distanceFromCenter = length(pixelOffset);

            if (distanceFromCenter > 0.0 && distanceFromCenter <= radiusPx) {
              vec2 sampleUv = vUv + pixelOffset * texelSize;
              float sampleMask = texture2D(maskTexture, sampleUv).r;
              neighbor = max(neighbor, sampleMask);
            }
          }
        }

        float expandedMask = smoothstep(
          expandedMaskStart,
          expandedMaskEnd,
          max(neighbor, center)
        );
        float solidUi = smoothstep(solidMaskStart, solidMaskEnd, center);
        float halo = expandedMask * (1.0 - solidUi) * opacity;

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
  maskMaterial: MeshBasicMaterial,
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
      object.material = maskMaterial;
    } else {
      object.visible = false;
    }
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

class UiHaloCompositePass extends Pass {
  private readonly clearColor = new Color();
  private readonly haloMaterial: ShaderMaterial;
  private readonly maskMaterial: MeshBasicMaterial;
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
    this.maskMaterial = new MeshBasicMaterial({
      color: UI_HALO.maskColor,
      depthTest: true,
      depthWrite: true,
      side: DoubleSide,
      toneMapped: false,
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
    const previousClearAlpha = renderer.getClearAlpha();

    renderer.getClearColor(this.clearColor);

    applyMaskSceneState(
      this.renderScene,
      targetSet,
      this.maskMaterial,
      this.snapshots,
    );

    try {
      renderer.setRenderTarget(this.maskTarget);
      renderer.setClearColor(UI_HALO.maskClearColor, UI_HALO.maskClearAlpha);
      renderer.clear(true, true, true);
      renderer.render(this.renderScene, this.renderCamera);
    } finally {
      restoreSceneState(this.snapshots);
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
  }

  override dispose() {
    this.quad.dispose();
    this.haloMaterial.dispose();
    this.maskMaterial.dispose();
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

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(haloPass);
    composer.addPass(new OutputPass());

    composerRef.current = composer;
    haloPassRef.current = haloPass;

    return () => {
      selectedObjects.length = 0;
      composerRef.current = null;
      haloPassRef.current = null;
      composer.dispose();
      haloPass.dispose();
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
