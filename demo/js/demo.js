// Author: Tomas Jakab
import * as THREE from 'https://unpkg.com/three@latest?module';

import { GUI } from 'https://unpkg.com/three@latest/examples/jsm/libs/dat.gui.module.js?module';

import { OrbitControls } from 'https://unpkg.com/three@latest/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@latest/examples/jsm/loaders/GLTFLoader.js?module';


function main() {
    // init renderer
    const container = document.querySelector('#demo-container');
    const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: false, alpha: true});
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement)
    
    // init scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);
    
    const fov = 25;
    const aspect = container.clientWidth / container.clientHeight;
    const near = 0.01;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    let cameraLookAt = [0, 0, 0];
    let cameraPosition = [0, 0, 10];
    camera.position.set(... cameraPosition);
    camera.lookAt(... cameraLookAt);
    scene.add(camera);
    
    // lights
    let lights = [];
    let ambientLight = new THREE.AmbientLight( 0xffffff, 1 );
    lights.push(ambientLight);
    scene.add(ambientLight);

    // add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = near;
    controls.maxDistance = far;
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.zoomSpeed = 0.2;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    
    // animation
    var object = {
        video: null,
        mesh: null,
        action: null,
        mixer: null,
        textureAnimator: null,
        map: null
    };
    var speed = 0.8;

    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( container.clientWidth, container.clientHeight );
    }


    function animate() {
        onWindowResize();
        requestAnimationFrame(animate);
        render();
    }

    
    function render() {
        // update animations
        // sync with video 
        if (object.video != null) {
            let time = object.video.currentTime;
            object.mixer.setTime(time);
            if (object.mesh.map != null) {
                object.textureAnimator.setTime(time);
            }
        }

        renderer.render(scene, camera);
    }


    function TextureAnimator(texture, frames, duration) {	
        this.time = 0;
        this.duration = duration;
        this.frames = frames;
        this.scale = 1;
    
        this.setEffectiveTimeScale = function(scale) {
            this.scale = scale;
        }
            
        this.update = function(deltaTimeInSeconds) {
            // update global time
            this.time += deltaTimeInSeconds * this.scale;
            this.time %= this.duration;

            this._update();
        };

        this.setTime = function(timeInSeconds) {
            // update global time
            this.time = timeInSeconds % this.duration;

            this._update();
        }

        this._update = function() {
            var frame = Math.floor(this.time / this.duration * this.frames);
            texture.offset.x = frame / this.frames;
        };
    }	


    function loadGLTF(url, scene, video_url) {
        const loader = new GLTFLoader();
        return loader.load(
            url,
            // called when the resource is loaded
            function ( gltf ) {

                var mesh = gltf.scene.children[0]
                object.map = mesh.material.map;
                scene.add( mesh );

                var mixer = new THREE.AnimationMixer(mesh);
                var animation = gltf.animations[0];
                var action = mixer.clipAction(animation).play();
                var numFrames = animation.tracks[0].times.length;
                var duration = animation.duration;
                var video = document.getElementById("demo-video");
                video.setAttribute('src', video_url)
                video.playbackRate = speed;
                video.play();
                
                object.mesh = mesh;
                object.video = video;
                object.action = action;
                object.mixer = mixer;
                object.textureAnimator = new TextureAnimator(mesh.material.map, numFrames, duration);

                document.getElementById("message").innerHTML = "";
            },
            // called while loading is progressing
            function ( xhr ) {
                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            // called when loading has errors
            function ( error ) {
                console.log( error );
            }
        );
    }

    function resetCamera() {
        camera.position.set(... cameraPosition);
        camera.lookAt(... cameraLookAt);
    }

    function enableTexture() {
        object.mesh.material.color = new THREE.Color( 0xffffff );
        object.mesh.material.map = object.map;
        lights.forEach(light => scene.remove(light));
        let ambientLight = new THREE.AmbientLight( 0xffffff, 1);
        lights.push(ambientLight);
        scene.add(ambientLight);
    }

    function disableTexture() {
        object.mesh.material.color = new THREE.Color( 0x808080 );
        object.mesh.material.map = null;
        lights.forEach(light => scene.remove(light));
        lights.length = 0;
        var light = new THREE.AmbientLight(0xffffff, 0.2);
        lights.push(light);
        scene.add(light);
        light = new THREE.DirectionalLight(0xffffff, 0.7);
        light.position.set( 0, 0, 1 );
        lights.push(light);
        scene.add(light);
        light = new THREE.DirectionalLight(0xffffff, 0.35);
        light.position.set( 0, 0, -1 );
        lights.push(light);
        scene.add(light);
    }


    function loadExample(elem) {
        document.getElementById("message").innerHTML = "Loading...";
        var video = document.getElementById("demo-video");
        video.setAttribute('src', '');
        // delete current model
        scene.remove(object.mesh);
        // load a new model
        loadGLTF(elem.dataset.glb, scene, elem.dataset.video);
    }
        
    // run 
    let examples = new Map();
    document.querySelectorAll('.demo-data').forEach((elem) => {
        examples.set(elem.dataset.name, elem);
    });
    loadExample(examples.values().next().value);


    var params = {
        orbitControl: true,
        resetCamera: function () {
            resetCamera();
        },
        speed: speed,
        texture: true,
        examples: examples.keys().next().value
    };

    var gui = new GUI();
    gui.add( params, 'examples', Array.from(examples.keys())).onChange( function (val) {
        if (document.getElementById("message").innerHTML.length > 0)
        return; 
        loadExample(examples.get(val));
    });
    
    gui.open();
    gui.add( params, 'texture' ).onChange( function ( val ) {
        if (val) {
            enableTexture();
        } else {
            disableTexture();
        }
        render();
    } );
    gui.add( params, 'speed', 0.16, 1 ).onChange( function ( val ) {
        speed = val;
        object.video.playbackRate = val;
        render();
    } );
    gui.add( params, 'resetCamera' ).name('reset camera');
    gui.close()
    
    onWindowResize();
    animate();
    
}

main();
