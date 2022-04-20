import 'regenerator-runtime/runtime'

import * as THREE from "three"
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"

import vertex from "../shaders/vertex.glsl"
import frag from "../shaders/frag.glsl"
import fragment from "../shaders/fragment.glsl"
import noise_frag from "../shaders/noise_frag.glsl"
import noise_vert from "../shaders/noise_vert.glsl"

import image from "../images/webgl.jpeg"

const images = {
    image
}

const shaders = {
    vertex,
    frag,
    fragment,
    noise_frag,
    noise_vert
}


 const PostProcessing = {
	uniforms: {
		'tDiffuse': { value: null },
    'howmuchrgbshifticanhaz': { value: 0.0 },
		'resolution': { value: null },
		'pixelSize': { value: 1.0 },
    'time': { value: 0.0 }
	},
  vertexShader: shaders.noise_vert,
  fragmentShader: shaders.noise_frag
};

class Stage {
  constructor() {
    this.renderParam = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    this.cameraParam = {
      fov: 70,
      near: 0.01,
      far: 1000,
      lookAt: new THREE.Vector3(0, 0, 0),
      x: 0,
      y: 0,
      z: 2
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.isInitialized = false;
  }

  init() {
    this._setScene();
    this._setRender();
    this._setCamera();

    this.isInitialized = true;
  }

  _setScene() {
    this.scene = new THREE.Scene();
  }

  _setRender() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("webgl-canvas"),
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize( this.renderParam.width, this.renderParam.height );
  }

  _setCamera() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if( !this.isInitialized ){
      this.camera = new THREE.PerspectiveCamera(
        this.cameraParam.fov,
        this.renderParam.width / this.renderParam.height,
        this.cameraParam.near,
        this.cameraParam.far
      );

      this.camera.position.set(
        this.cameraParam.x,
        this.cameraParam.y,
        this.cameraParam.z
      );
      this.camera.lookAt(this.cameraParam.lookAt);
    }

    this.camera.aspect = windowWidth / windowHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(windowWidth, windowHeight);
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this._setCamera();
  }

  onRaf() {
    this._render();
  }
}

class Mesh {
  constructor(stage) {
    this.geometryParam = {
      width: 1,
      height: 1
    }

    // this.t = new THREE.TextureLoader().load('https://i.postimg.cc/3xb2X6Mh/image.jpg');

    this.t = new THREE.TextureLoader().load(images.image)

    this.t.wrapS = this.t.wrapT = THREE.MirroredRepeatWrapping;

    this.uniforms =  {
      time: { type: "f", value: 0.0 },
      mouse: { type: "f", value: 0.0 },
      t1: { type: "t", value: this.t }
    }

    this.stage = stage;
    this.mouse = 0;
  }

  init() {
    this._setMesh();
    this._setPostEffect();
    this.onMouseMove();
  }

  _setMesh() {
    const geometry = new THREE.IcosahedronGeometry(
      this.geometryParam.width,
      this.geometryParam.height
    );
    const geometry1 = new THREE.IcosahedronGeometry(
      1.001,
      this.geometryParam.height
    );
    const length = geometry1.attributes.position.array.length;
    const bary = [];

    for(let i = 0; i < length / 3; i++) {
      bary.push(0, 0, 1, 0, 1, 0, 1, 0, 0);
    }

    const aBary = new Float32Array(bary);
    geometry1.setAttribute("aBary", new THREE.BufferAttribute(aBary, 3), );

    this.material = new THREE.ShaderMaterial({
    //   vertexShader: document.getElementById("js-vertex-shader").textContent,
      vertexShader: shaders.vertex,
      fragmentShader: shaders.frag,
    //   fragmentShader: document.getElementById("js-fragment-shader").textContent,
      uniforms: this.uniforms,
      side: THREE.DoubleSide
    });

    this.material1 = new THREE.ShaderMaterial({
        //   vertexShader: document.getElementById("js-vertex-shader").textContent,
        vertexShader: shaders.vertex,
        fragmentShader: shaders.fragment,
      // fragmentShader: document.getElementById("js-fragment-shader-1").textContent,
      uniforms: this.uniforms,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.meshLine = new THREE.Mesh(geometry1, this.material1);
    this.stage.scene.add(this.mesh);
    this.stage.scene.add(this.meshLine);
  }

  _setPostEffect() {
    this.composer = new EffectComposer(this.stage.renderer);
    this.composer.addPass(new RenderPass(this.stage.scene, this.stage.camera));
    this.customPass = new ShaderPass( PostProcessing );
    this.customPass.uniforms[ "resolution" ].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.customPass.uniforms[ "resolution" ].value.multiplyScalar(window.devicePixelRatio);
    this.composer.addPass(this.customPass);
  }

  _render() {
    this.uniforms.time.value += 0.0015;
    this.mouse -= (this.mouse - this.speed) * 0.005;
    this.speed *= 0.99;
    this.stage.scene.rotation.x = this.uniforms.time.value;
    this.stage.scene.rotation.y = this.uniforms.time.value;
    this.material.uniforms.mouse.value = this.mouse;
    this.material1.uniforms.mouse.value = this.mouse;
    this.customPass.uniforms.time.value = this.uniforms.time.value;
    this.customPass.uniforms.howmuchrgbshifticanhaz.value = this.mouse / 5.0;
    this.composer.render();
  }

  onMouseMove() {
    this.lastX = 0;
    this.lastY = 0;
    this.speed = 0;

    window.addEventListener("mousemove", (e) => {
      this.speed = Math.sqrt((e.pageX - this.lastX) ** 2 + (e.pageY - this.lastY) ** 2.0) * 0.1;
      this.lastX = e.pageX;
      this.lastY = e.pageY;
    });
  }

  onResize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  onRaf() {
    this._render();
  }
}

(() => {
  const stage = new Stage();
  const mesh = new Mesh(stage);

  stage.init();
  mesh.init();

  window.addEventListener("resize", () => {
    stage.onResize();
    mesh.onResize();
  });

  const _raf = () => {
    window.requestAnimationFrame(() => {
      stage.onRaf();
      mesh.onRaf();

      _raf();
    });
  }

  _raf();
})();
