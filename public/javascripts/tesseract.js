THREE.AdditiveBlendShader = {

	uniforms: {

		'tDiffuse': { type: 't', value: null },
		'tAdd': { type: 't', value: null },
		'amount': { type: 'f', value: 1.0 }

	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

			'vUv = uv;',
			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [


		'uniform sampler2D tDiffuse;',
		'uniform sampler2D tAdd;',
		'uniform float amount;',

		'varying vec2 vUv;',

		'void main() {',

			'vec4 texelBase = texture2D( tDiffuse, vUv );',
			'vec4 texelAdd = texture2D( tAdd, vUv );',
			'gl_FragColor = texelBase + texelAdd * amount;',

		'}'

	].join('\n')

};

var finalShader = {

	uniforms: {

		'tDiffuse': { type: 't', value: null },
		'tAdd': { type: 't', value: null },
		'amount': { type: 'f', value: 1.0 }

	},

	vertexShader: [

		'varying vec2 vUv;',

		'void main() {',

			'vUv = uv;',
			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

		'}'

	].join('\n'),

	fragmentShader: [


		'uniform sampler2D tDiffuse;',
		'uniform sampler2D tAdd;',
		'uniform float amount;',

		'varying vec2 vUv;',

		'void main() {',

			'vec4 texelBase = texture2D( tDiffuse, vUv );',
			'vec4 texelAdd = texture2D( tAdd, vUv );',
			'gl_FragColor = texelBase + texelAdd * amount;',

		'}'

	].join('\n')

};

var outline_shader = {
	uniforms: {
			"linewidth":  { type: "f", value: 0.06 },
	},
	vertex_shader: [
			"uniform float linewidth;",
			"void main() {",
					"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
					"vec4 displacement = vec4( normalize( normalMatrix * normal ) * linewidth, 0.0 ) + mvPosition;",
					"gl_Position = projectionMatrix * displacement;",
			"}"
	].join("\n"),
	fragment_shader: [
			"void main() {",
					"gl_FragColor = vec4( 0.0, 0.3, 0.35, 1.0 );",
			"}"
	].join("\n")
};

var container, scene, camera, renderer, controls, stats, composer;
var clock = new THREE.Clock();

// Particle
var particleSystem, particleUniforms, particleGeometry, particles;
var smallParticleSystem, smallParticleUniforms, smallParticleGeometry, smallParticles;
var smokeParticleSystem, smokeParticleUniforms, smokeParticleGeometry, smokeParticles;
var num_particles = 400;
var num_particles_small = 150;
var num_smoke = 150;
var positions = [];
var colors = [];
var sizes = [];

// Glow
var tesseractGlow;
var glowScene, glowComposer;
var glowRenderer;

var finalComposer;
var alphaComposer;


var renderTarget, renderTargetGlow, renderTargetAlpha, renderTargetFinal;

// Composer
var effectFXAA, bloomPass, renderScene;
var effectFXAAGlow, bloomPassGlow, renderGlowScene;
var blendPass, finalShader, finalPass;

init();
animate();

function init() {

	// Render Target Params
	var renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBufer: false };

	// SCENE
	scene = new THREE.Scene();

	scene.background = new THREE.CubeTextureLoader()
					.setPath( '../images/tesseract/' )
					.load( [ 'nebula-xpos.png', 'nebula-xneg.png', 'nebula-ypos.png', 'nebula-yneg.png', 'nebula-zpos.png', 'nebula-zneg.png' ] );

	// scene.background = new THREE.Color( 0x000000 )

	// CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	camera.position.set(0,0,50);

	// RENDERER
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer(); 

	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	renderer.setPixelRatio( window.devicePixelRatio );
	container = document.getElementById('ThreeJS');
	container.appendChild(renderer.domElement);

	// Event Listener
	window.addEventListener( 'resize', onWindowResize, false );

	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );

	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );

	// LIGHT

	// spotlight #1
	var spotlight = new THREE.SpotLight(0xffffff);
	spotlight.position.set(-60,150,-30);
	spotlight.angle = Math.PI/4;
	spotlight.intensity = 1;
	scene.add(spotlight);

	// spotlight #2
	var spotlight2 = new THREE.SpotLight(0xffffff);
	spotlight2.position.set(60,150,-60);
	spotlight2.angle = Math.PI/4;
	spotlight2.intensity = 0.5;
	scene.add(spotlight2);

	
	// spotlight #3
	var spotlight3 = new THREE.SpotLight(0xffffff);
	spotlight3.position.set(150,80,-100);
	spotlight3.intensity = 1;

	scene.add(spotlight3);

	// change the direction this spotlight is facing
	var lightTarget = new THREE.Object3D();
	lightTarget.position.set(150,10,-100);
	scene.add(lightTarget);
	spotlight3.target = lightTarget;
	renderer.shadowMap.enabled = true;

	//ADJUST SHADOW DARKNESS
	scene.add( new THREE.AmbientLight( 0xffffff, 10 ) );

	tesseractTexture = new THREE.TextureLoader().load('../images/tesseract/space_tex.jpg' );

	var tesseractGeometry = new THREE.BoxGeometry(15,15,15,2,2,2);
	var tesseractMaterial = new THREE.MeshPhongMaterial( {
		// map: tesseractTexture, 
		// shininess: 1,
		// reflectivity: 0.8 ,
		// color: 0xaaaa77,
		color: 0x00BDFF, 
		transparent:true, 
		opacity:0.5, 
		refractionRatio: 0.95,
		combine: THREE.MixOperation, 
		envMap: scene.background, 
		side: THREE.DoubleSide, 
	});
	tesseractMaterial.envMap.mapping = THREE.CubeRefractionMapping;
	tesseract = new THREE.Mesh( tesseractGeometry, tesseractMaterial );
	tesseract.position.set(0,0,0);
	camera.lookAt(tesseract.position);
	scene.add(tesseract);

	// POST
	renderScene = new THREE.RenderPass( scene, camera );
	effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 0.2, 0.5, 0.2);
	bloomPass.needSwap = true;
	bloomPass.renderToScreen = true;
	renderTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
	composer = new THREE.EffectComposer( renderer, renderTarget );
	composer.setSize( window.innerWidth, window.innerHeight );
	composer.addPass( renderScene );
	composer.addPass( effectFXAA );
	composer.addPass( bloomPass );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	
	
	//////////////////////////////
	// 													//
	// 			Particle Section		//
	// 													//
	//////////////////////////////
	particles = new THREE.Geometry()
  var pMaterial = new THREE.PointsMaterial({
		color: 0x010203,
		size: 4,
		map: new THREE.TextureLoader().load( "../images/particle/smokeparticle.png" ),
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
	});

	var radius = 7

	for (var p = 0; p < num_particles; p++) {

		pos_chance = Math.random()*10
		if (pos_chance < 1){
			var pX = ( Math.random() * 2 - 1 ) * radius/2.2,
			pY = ( Math.random() * 2 - 1 ) * radius/2.2,
			pZ = ( Math.random() * 2 - 1 ) * radius/2.2,
			particle = new THREE.Vector3(pX, pY, pZ)
			particle.bound = radius/2.2
		}else if (pos_chance < 4) {
			var pX = ( Math.random() * 2 - 1 ) * radius/1.7,
				pY = ( Math.random() * 2 - 1 ) * radius/1.7,
				pZ = ( Math.random() * 2 - 1 ) * radius/1.7,
				particle = new THREE.Vector3(pX, pY, pZ)
				particle.bound = radius/1.7 - 1
		}else {
			var pX = ( Math.random() * 2 - 1 ) * radius/1.4,
				pY = ( Math.random() * 2 - 1 ) * radius/1.4,
				pZ = ( Math.random() * 2 - 1 ) * radius/1.4,
				particle = new THREE.Vector3(pX, pY, pZ)
				particle.bound = radius/1.4
		}

		particle.velocity = new THREE.Vector3(
			Math.random() * 10 - 5,              
			Math.random() * 10 - 5, 
			Math.random() * 10 - 5
		);            

		particles.vertices.push(particle);
	}

	particleSystem = new THREE.Points(
		particles,
		pMaterial
	);

	particleSystem.sortParticles = true;
	scene.add(particleSystem);

	// 
	// Particle Small
	// 
	smallParticles = new THREE.Geometry()
  var smallPMaterial = new THREE.PointsMaterial({
		color: 0x010203,
		size: 3,
		map: new THREE.TextureLoader().load( "../images/particle/spark.png" ),
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
	});

	var radius = 7

	for (var p = 0; p < num_particles_small; p++) {

		pos_chance = Math.random()*10
		var pX = ( Math.random() * 2 - 1 ) * radius,
			pY = ( Math.random() * 2 - 1 ) * radius,
			pZ = ( Math.random() * 2 - 1 ) * radius,
			particle = new THREE.Vector3(pX, pY, pZ)
			particle.bound = radius - 1

		particle.velocity = new THREE.Vector3(
			Math.random() * 10 - 5,              
			Math.random() * 10 - 5, 
			Math.random() * 10 - 5
		);            

		smallParticles.vertices.push(particle);
	}

	smallParticleSystem = new THREE.Points(
		smallParticles,
		smallPMaterial
	);

	smallParticleSystem.sortParticles = true;
	// scene.add(smallParticleSystem);


	// 
	// Smoke Particle
	// 
	smokeParticles = new THREE.Geometry()
  var smokeMaterial = new THREE.PointsMaterial({
		color: 0x000000,
		size: 3,
		map: new THREE.TextureLoader().load( "../images/particle/smoke512.png" ),
		blending: THREE.MultiplicativeBlending,
		transparent: true,
		depthTest: false,
	});

	// now create the individual particles
	for (var p = 0; p < num_smoke; p++) {
		// create a particle with random
		// position values, -250 -> 250
		var pX = ( Math.random() * 2 - 1 ) * radius,
			pY = ( Math.random() * 2 - 1 ) * radius,
			pZ = ( Math.random() * 2 - 1 ) * radius,
		particle = new THREE.Vector3(pX, pY, pZ)
		particle.bound = radius - 2

		particle.velocity = new THREE.Vector3(
			Math.random() * 10 - 5,              
			Math.random() * 10 - 5, 
			Math.random() * 10 - 5
		);            

		smokeParticles.vertices.push(particle);
	}

	// create the particle system
	smokeParticleSystem = new THREE.Points(
		smokeParticles,
		smokeMaterial
	);

	smokeParticleSystem.sortParticles = true;
	// scene.add(smokeParticleSystem);

	//////////////////////////////
	// 													//
	// 			GLOWING SECTION			//
	// 													//
	//////////////////////////////

	glowScene = new THREE.Scene();

	glowScene.background = new THREE.Color( 0x000000 )
	// 
	// Setup to be the same as normal Scene
	// 
	glowScene.add( camera )
	glowScene.add( spotlight );
	glowScene.add( spotlight2 );
	glowScene.add( spotlight3 );
	glowScene.add( new THREE.AmbientLight( 0xffffff, 10 ) );
	
	// 
	// Outline
	// 
	var outlineMaterial = new THREE.MeshPhongMaterial( { 
		color: 0x002233, 
		side: THREE.BackSide 
	});

	var borderMaterial = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.clone(outline_shader.uniforms),
		vertexShader: outline_shader.vertex_shader,
		fragmentShader: outline_shader.fragment_shader
	});

	var borderTesseract = new THREE.Mesh( tesseractGeometry, borderMaterial );
	borderTesseract.position = tesseract.position;
	glowScene.add( borderTesseract );


	var outlineTesseract = new THREE.Mesh( tesseractGeometry, outlineMaterial );
	outlineTesseract.position = tesseract.position;
	outlineTesseract.scale.multiplyScalar(1.02);
	glowScene.add( outlineTesseract );

	var blackTesseractGeometry = new THREE.BoxGeometry(15,15,15);
	var blackTesseractMaterial = new THREE.MeshBasicMaterial( { 
		color: 0x22ccff
	});
	var blackTesseract = new THREE.Mesh( blackTesseractGeometry, blackTesseractMaterial );
	blackTesseract.position.set(0,0,0);
	glowScene.add( blackTesseract )

	// // POST FOR GLOWING BACKGROUND
	renderGlowScene = new THREE.RenderPass( glowScene, camera );
	effectFXAAGlow = new THREE.ShaderPass( THREE.FXAAShader );
	effectFXAAGlow.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	bloomPassGlow = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 4, 1.2, 0.4);
	bloomPassGlow.needSwap = true;
	bloomPassGlow.renderToScreen = false;
	// bloomPassGlow.renderToScreen = true;

	renderTargetGlow = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
	glowComposer = new THREE.EffectComposer( renderer, renderTargetGlow );
	glowComposer.setSize( window.innerWidth, window.innerHeight );
	glowComposer.addPass( renderGlowScene );
	glowComposer.addPass( effectFXAAGlow );
	glowComposer.addPass( bloomPassGlow );
	glowComposer.addPass( new THREE.ShaderPass( THREE.CopyShader ) )

	// 
	// BLENDING IT ALL
	// 

	finalShader.uniforms[ 'tAdd' ].value = glowComposer.renderTarget2;
	finalShader.uniforms[ 'amount' ].value = 1
	finalPass = new THREE.ShaderPass( finalShader );
	finalPass.needsSwap = true;
	finalPass.renderToScreen = true;
	renderTarget = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
	finalComposer = new THREE.EffectComposer( renderer, renderTarget );
	finalComposer.addPass( renderScene );
	finalComposer.addPass( effectFXAA );
	finalComposer.addPass( bloomPass );
	finalComposer.addPass( finalPass );


}

// Resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

	// Composer
	composer.setSize( window.innerWidth, window.innerHeight );
	effectFXAA.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight );

	// Glow Composer
	glowComposer.setSize( window.innerWidth, window.innerHeight );
	effectFXAAGlow.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight );

	// Final Composer
	finalComposer.setSize( window.innerWidth, window.innerHeight );
	
	// Alpha Composer
	// alphaComposer.setSize( window.innerWidth, window.innerHeight );
}

function animate() 
{
  requestAnimationFrame( animate );
	render();		
	update();
}
function update()
{

	controls.update();
	stats.update();	
	var dt = clock.getDelta() * 0.5;

	// random move particle
	var pCount = num_particles;
  while (pCount--) {

		// Particle Movement
		var particle = particles.vertices[pCount];
    if (particle.y < -1*particle.bound) {
      particle.velocity.y = -1 * particle.velocity.y;
		}
		if (particle.y > particle.bound) {
      particle.velocity.y = -1 * particle.velocity.y;
		}
		if (particle.x < -1*particle.bound) {
      particle.velocity.x = -1 * particle.velocity.x;
		}
		if (particle.x > particle.bound) {
      particle.velocity.x = -1 * particle.velocity.x;
		}
		if (particle.z < -1*particle.bound) {
      particle.velocity.z = -1 * particle.velocity.z;
		}
		if (particle.z > particle.bound) {
      particle.velocity.z = -1 * particle.velocity.z;
		}
		particle.x = particle.x + particle.velocity.x * dt
		particle.y = particle.y + particle.velocity.y * dt
		particle.z = particle.z + particle.velocity.z * dt
	}
	particles.verticesNeedUpdate = true

	var smallCount = num_particles_small
	while (smallCount--){
		var smallParticle = smallParticles.vertices[smallCount];
		if (smallParticle.y < -1*smallParticle.bound) {
			smallParticle.velocity.y = -1 * smallParticle.velocity.y;
		}
		if (smallParticle.y > smallParticle.bound) {
			smallParticle.velocity.y = -1 * smallParticle.velocity.y;
		}
		if (smallParticle.x < -1*smallParticle.bound) {
			smallParticle.velocity.x = -1 * smallParticle.velocity.x;
		}
		if (smallParticle.x > smallParticle.bound) {
			smallParticle.velocity.x = -1 * smallParticle.velocity.x;
		}
		if (smallParticle.z < -1*smallParticle.bound) {
			smallParticle.velocity.z = -1 * smallParticle.velocity.z;
		}
		if (smallParticle.z > smallParticle.bound) {
			smallParticle.velocity.z = -1 * smallParticle.velocity.z;
		}
		smallParticle.x = smallParticle.x + smallParticle.velocity.x * dt * 0.2
		smallParticle.y = smallParticle.y + smallParticle.velocity.y * dt * 0.2
		smallParticle.z = smallParticle.z + smallParticle.velocity.z * dt * 0.2
	}
	smallParticles.verticesNeedUpdate = true

	var smokeCount = num_smoke
	while (smokeCount--){
		var smokeParticle = smokeParticles.vertices[smokeCount];
		if (smokeParticle.y < -1*smokeParticle.bound) {
			smokeParticle.velocity.y = -1 * smokeParticle.velocity.y;
		}
		if (smokeParticle.y > smokeParticle.bound) {
			smokeParticle.velocity.y = -1 * smokeParticle.velocity.y;
		}
		if (smokeParticle.x < -1*smokeParticle.bound) {
			smokeParticle.velocity.x = -1 * smokeParticle.velocity.x;
		}
		if (smokeParticle.x > smokeParticle.bound) {
			smokeParticle.velocity.x = -1 * smokeParticle.velocity.x;
		}
		if (smokeParticle.z < -1*smokeParticle.bound) {
			smokeParticle.velocity.z = -1 * smokeParticle.velocity.z;
		}
		if (smokeParticle.z > smokeParticle.bound) {
			smokeParticle.velocity.z = -1 * smokeParticle.velocity.z;
		}
		smokeParticle.x = smokeParticle.x + smokeParticle.velocity.x * dt * 0.3
		smokeParticle.y = smokeParticle.y + smokeParticle.velocity.y * dt * 0.3
		smokeParticle.z = smokeParticle.z + smokeParticle.velocity.z * dt * 0.3
	}
	smokeParticles.verticesNeedUpdate = true
	
}
function render() 
{
	// renderer.clear()
	// renderer.clearDepth()
	// renderer.clear()
	// composer.render()
	// renderer.render(glowScene, camera)
	glowComposer.render( 0.1 )
	finalComposer.render( 0.1 )

}