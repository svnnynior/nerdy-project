var container, scene, camera, renderer, controls, stats, composer;
var clock = new THREE.Clock();
var keyboard = new THREEx.KeyboardState();
var tick = 0;

// Particle
var particleSystem, particleUniforms, particleGeometry, particles;
var num_particles = 30;
var positions = [];
var colors = [];
var sizes = [];

var sphere;

var effectFXAA, bloomPass, renderScene;
var composer;

var uniforms;

init();
animate();

function init() {

	// SCENE
	scene = new THREE.Scene();

	scene.background = new THREE.CubeTextureLoader()
					.setPath( '../images/egg/' )
					.load( [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ] );
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
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById('ThreeJS');
	container.appendChild(renderer.domElement);

	// EVENTS
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
	var spotlight = new THREE.SpotLight(0xffffff);
	spotlight.position.set(40,40,0);

	spotlight.shadow.mapSize.width = 1024;
	spotlight.castShadow = true;
	scene.add(spotlight);
	scene.add( new THREE.AmbientLight( 0xffffff, 2 ) );

	//EGG
	var points = [];
	for ( var deg = 0; deg <= 180; deg += 6 ) {
    	var rad = Math.PI * deg / 180;
    	var corx = Math.max((( 0.76 + .08 * Math.cos( rad ) ) * Math.sin( rad ) * 10),0);
    	var cory = - Math.cos( rad ) *10
    	var point = new THREE.Vector2(corx, cory);
    	//console.log( point );
    	points.push( point );
	}
	var eggGeometry = new THREE.LatheBufferGeometry(points,32);

	//TEXTURE
	var textureLoader = new THREE.TextureLoader();
		
	var baseTexture = textureLoader.load( '../images/egg/yellowFlake-DarkSqSm2.jpg' );
	baseTexture.wrapS = baseTexture.wrapT = THREE.RepeatWrapping;
	var baseSpeed = 0.02;

	var noiseTexture = textureLoader.load( '../images/egg/cloud.png' );
	noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping; 
	var noiseScale = 0.5;

	var blendTexture = noiseTexture;
	blendTexture.wrapS = blendTexture.wrapT = THREE.RepeatWrapping;
	this.customUniforms = {
		baseTexture: 	{ type: "t", value: baseTexture },
		baseSpeed:		{ type: "f", value: baseSpeed },
		noiseTexture:	{ type: "t", value: noiseTexture },
		noiseScale:		{ type: "f", value: noiseScale },
		blendTexture:	{ type: "t", value: blendTexture },
		alpha: 			{ type: "f", value: 0.4 },
		time: 			{ type: "f", value: 1.0 }
	};
	
	var eggMovingMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: customUniforms,
		vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
	}   );

	eggMovingMaterial.transparent = true;
	eggMovingMaterial.depthWrite = false;

	egg = new THREE.Mesh( eggGeometry, eggMovingMaterial );
	egg.position.set(0,0,0);
	egg.castShadow = true; 
	camera.lookAt(egg.position);
	scene.add(egg)


	var eggMaterial = new THREE.MeshPhongMaterial( { 
		color: 0xff975b, 
		transparent:true, 
		opacity:0.5, 
		refractionRatio: 0.3,
		envMap: scene.background, 
		shininess: 3,
		combine: THREE.MixOperation, 
		reflectivity: 0.3 ,
		side: THREE.FrontSide 
	});
	eggMaterial.depthWrite = false
	eggMaterial.envMap.mapping = THREE.CubeRefractionMapping;

	var colourEgg = egg.clone()
	colourEgg.scale.set(1.001,1.001,1.001);
	colourEgg.material = eggMaterial;
	scene.add(colourEgg);

	// Particle
	particles = new THREE.Geometry()
  	var pMaterial = new THREE.PointsMaterial({
		color: 0x333333,
		size: 15,
		map: new THREE.TextureLoader().load( "../images/particle/smokeparticle.png" ),
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
	});

	var radius = 4
	for (var p = 0; p < num_particles; p++) {
		pX = ( Math.random() * 2 - 1 ) * radius;
		pY = ( Math.random() * 2 - 1 ) * radius;
		pZ = ( Math.random() * 2 - 1 ) * radius;
		particle = new THREE.Vector3(pX, pY, pZ);

		mx = Math.random();
		my = Math.random();
		mz = Math.random();

		var vx,vy,vz;

		if(mx > 0.5){
			vx = Math.random() * 5
		}
		else{
			vx = Math.random() * -5
		}

		if(my > 0.5){
			vy = Math.random() * 5
		}
		else{
			vy = Math.random() * -5
		}

		if(mz > 0.5){
			vz = Math.random() * 5
		}
		else{
			vz = Math.random() * -5
		}
		particle.velocity = new THREE.Vector3(vx,vy,vz);            
		particles.vertices.push(particle);
	}

	particleSystem = new THREE.Points(
		particles,
		pMaterial
	);

	particleSystem.sortParticles = true;
	scene.add(particleSystem);



	//Egg Glow	
	this.glowUniform = { 
			"p":   { type: "f", value: 8 },
			glowColor: { type: "c", value: new THREE.Color(0xffffff) },
			viewVector: { type: "v3", value: camera.position },
			lightVector: {type: "v3", value: spotlight.position}
		}
	var customMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: glowUniform,
		vertexShader:   document.getElementById( 'glowVertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'glowFragmentShader' ).textContent,
		side: THREE.FrontSide,
		blending: THREE.AdditiveBlending,
		transparent: true,
	}   );

	this.eggGlow = new THREE.Mesh( eggGeometry.clone(), customMaterial.clone() );
    eggGlow.position = egg.position;
	eggGlow.scale.multiplyScalar(1.001);
	scene.add(eggGlow);

	// Simple Glow
	var spriteMap = new THREE.TextureLoader().load( '../images/egg/glow.png' );
	var spriteMaterial = new THREE.SpriteMaterial( { 
		map: spriteMap, 
		color: 0xfff1ba, 
		transparent: false, 
		blending: THREE.AdditiveBlending 
	} );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(40, 40, 1)
	scene.add( sprite );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

	// Composer
	// composer.setSize( window.innerWidth, window.innerHeight );
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
	eggGlow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors( camera.position, eggGlow.position );

	var dt = clock.getDelta() * 0.5;
	// uniforms.time.value += 0.2 * dt;

	// random move particle
	var pCount = num_particles;
	while (pCount--) {

		// get the particle
		var particle = particles.vertices[pCount];
		var rad = Math.acos(particle.y/-10)
		var X_bound = ( 0.76 + .08 * Math.cos( rad ) ) * Math.sin( rad ) * 6.5;
		var Y_bound = 6.5;

		if(particle.y > 9){
			console.log(particle.y)
			console.log(rad)
			console.log(X_bound)
		} 
		if (particle.x + particle.velocity.x * dt> X_bound) {
			particle.velocity.x = -1 * particle.velocity.x;
		}
		if (particle.z + particle.velocity.z * dt < -1*X_bound) {
			particle.velocity.z = -1 * particle.velocity.z;
		}
		if (particle.z + particle.velocity.z * dt> X_bound) {
			particle.velocity.z = -1 * particle.velocity.z;
		}
		if (particle.x + particle.velocity.x * dt< -1*X_bound) {
			particle.velocity.x = -1 * particle.velocity.x;
		}
		if (particle.y + particle.velocity.y * dt < -1*Y_bound) {
			particle.velocity.y = -1 * particle.velocity.y;
		}
		if (particle.y + particle.velocity.y * dt> Y_bound) {
			particle.velocity.y = -1 * particle.velocity.y;
		}

		// and the position
		particle.x = particle.x + particle.velocity.x * dt;
		particle.y = particle.y + particle.velocity.y * dt;
		particle.z = particle.z + particle.velocity.z * dt;
	}
	// flag to the particle system
	// that we've changed its vertices.
	particles.verticesNeedUpdate = true;
	customUniforms.time.value += dt * 3;

}
function render() 
{
	renderer.clear();
	//composer.render( 0.001 );
	renderer.render( scene, camera );
	//composer.render()
}