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
var num_particles = 400
var positions = [];
var colors = [];
var sizes = [];

// Glow
var tesseractGlow;

// Fire
var mesh;
var fire, fire_rotate;

// Composer
var effectFXAA, bloomPass, renderScene;
var composer;

var sphere;

// GLow
var glowScene, glowComposer;
var glowRenderer;
var effectFXAAGlow, bloomPassGlow, renderGlowScene;

init();
animate();

function init() {

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

	// spotlight #1 -- yellow, dark shadow
	var spotlight = new THREE.SpotLight(0xffffff);
	spotlight.position.set(-60,150,-30);
	spotlight.angle = Math.PI/4;
	spotlight.intensity = 1;
	scene.add(spotlight);

	// spotlight #2 -- red, light shadow
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

	var tesseractGeometry = new THREE.BoxGeometry(15,15,15,2,2,2);
	var tesseractMaterial = new THREE.MeshPhongMaterial( { 
		color: 0x00BDFF, 
		transparent:true, 
		opacity:0.5, 
		refractionRatio: 0.95,
		envMap: scene.background, 
		side: THREE.DoubleSide 
	});
	tesseractMaterial.envMap.mapping = THREE.CubeRefractionMapping;
	tesseract = new THREE.Mesh( tesseractGeometry, tesseractMaterial );
	tesseract.position.set(0,0,0);
	camera.lookAt(tesseract.position);
	scene.add(tesseract);

	var customMaterial = new THREE.ShaderMaterial( 
	{
		uniforms: 
		{ 
			"c":   { type: "f", value: 0.6},
			"p":   { type: "f", value: 2.0 },
			glowColor: { type: "c", value: new THREE.Color(0x098bff) },
			viewVector: { type: "v3", value: camera.position }
		},
		vertexShader:   document.getElementById( 'glowVertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'glowFragmentShader' ).textContent,
		side: THREE.BackSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	});

	var modifier = new THREE.BufferSubdivisionModifier( 4 );
	var smoothTesseractGeometry = modifier.modify( tesseractGeometry );

	tesseractGlow = new THREE.Mesh( smoothTesseractGeometry , customMaterial.clone() );
  tesseractGlow.position = tesseract.position;
	tesseractGlow.scale.multiplyScalar(1.0);
	// scene.add(tesseractGlow);

	// POST
	renderScene = new THREE.RenderPass( scene, camera );
	effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 0.02, 0.5, 0.2);
	// renderScene.renderToScreen = true;
	// effectFXAA.renderToScreen = true;
	bloomPass.renderToScreen = true;
	composer = new THREE.EffectComposer( renderer );
	composer.setSize( window.innerWidth, window.innerHeight );
	composer.addPass( renderScene );
	composer.addPass( effectFXAA );
	composer.addPass( bloomPass );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;

	// 
	// Fire
	// 
	var wireframeMat = new THREE.MeshBasicMaterial({
		color : new THREE.Color(0xffffff),
		wireframe : true
	});

	var fireTex = new THREE.TextureLoader().load("../images/resources/BlueFire.png");
	fire = new THREE.Fire(fireTex, new THREE.Color( 0x00ffff ), 0);
	fire.position.set(0, 0.3, 0);
	var wireframe = new THREE.Mesh(fire.geometry, wireframeMat.clone());
	fire.add(wireframe);
	wireframe.visible = true;
	wireframe.visible = false;
	// scene.add(fire);

	// fire_rotate = new THREE.Fire(fireTex, new THREE.Color( 0x00ffff ), 3.1415);
	// fire_rotate.position.set(0, -0.4, 0);
	// var wireframe2 = new THREE.Mesh(fire_rotate.geometry, wireframeMat.clone());
	// fire_rotate.add(wireframe2)
	// wireframe2.visible = true;
	// wireframe2.visible = false;
	// scene.add(fire_rotate);
	
	// Particle
	var pointLight = new THREE.PointLight(0xffffff);
	pointLight.position.set(0,0,0)
	scene.add(pointLight)

	// particleUniforms = {
	// 	texture:   { value: new THREE.TextureLoader().load( "../images/particle/smokeparticle.png" ) }
	// };

	// particleGeometry = new THREE.BufferGeometry();

	// var shaderMaterial = new THREE.ShaderMaterial( {
	// 	uniforms:       particleUniforms,
	// 	vertexShader:   document.getElementById( 'particleVertexshader' ).textContent,
	// 	fragmentShader: document.getElementById( 'particleFragmentshader' ).textContent,
	// 	blending:       THREE.AdditiveBlending,
	// 	depthTest:      false,
	// 	transparent:    true,
	// 	vertexColors:   true
	// })

	// var radius = 7

	// for ( var i = 0; i < num_particles; i ++ ) {
	// 	positions.push( ( Math.random() * 2 - 1 ) * radius );
	// 	positions.push( ( Math.random() * 2 - 1 ) * radius );
	// 	positions.push( ( Math.random() * 2 - 1 ) * radius );
	// 	colors.push( 0.07, 0.2, 0.2 );
	// 	sizes.push( Math.random() * 10 );
	// }

	// particleGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	// particleGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	// particleGeometry.addAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setDynamic( true ) );

	// particleSystem = new THREE.Points( particleGeometry, shaderMaterial );
	// scene.add( particleSystem );

	// 
	// Another Method
	// 
	particles = new THREE.Geometry()
  var pMaterial = new THREE.PointsMaterial({
		color: 0x010203,
		size: 5,
		map: new THREE.TextureLoader().load( "../images/particle/smokeparticle.png" ),
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: false,
	});

	var radius = 7
	// now create the individual particles
	for (var p = 0; p < num_particles; p++) {

		// create a particle with random
		// position values, -250 -> 250
		pos_chance = Math.random()*10
		if (pos_chance < 1){
			var pX = ( Math.random() * 2 - 1 ) * radius/2.2,
			pY = ( Math.random() * 2 - 1 ) * radius/2.2,
			pZ = ( Math.random() * 2 - 1 ) * radius/2.2,
			particle = new THREE.Vector3(pX, pY, pZ)
			particle.bound = radius/2.2
		}else if (pos_chance < 3) {
			var pX = ( Math.random() * 2 - 1 ) * radius/1.7,
				pY = ( Math.random() * 2 - 1 ) * radius/1.7,
				pZ = ( Math.random() * 2 - 1 ) * radius/1.7,
				particle = new THREE.Vector3(pX, pY, pZ)
				particle.bound = radius/1.7
		}else {
			var pX = ( Math.random() * 2 - 1 ) * radius,
				pY = ( Math.random() * 2 - 1 ) * radius,
				pZ = ( Math.random() * 2 - 1 ) * radius,
				particle = new THREE.Vector3(pX, pY, pZ)
				particle.bound = radius - 1
		}

			particle.velocity = new THREE.Vector3(
				Math.random() * 10 - 5,              
				Math.random() * 10 - 5, 
				Math.random() * 10 - 5
			);            

		// add it to the geometry
		particles.vertices.push(particle);
	}

	// create the particle system
	particleSystem = new THREE.Points(
		particles,
		pMaterial
	);

	particleSystem.sortParticles = true;

	// add it to the scene
	scene.add(particleSystem); 

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

	// var h = 7.5
	// var outlineGeometry = new THREE.BufferGeometry();
	// 			var position = [];
	// 			position.push(
	// 				-h, -h, -h,
	// 				-h, h, -h,
	// 				-h, h, -h,
	// 				h, h, -h,
	// 				h, h, -h,
	// 				h, -h, -h,
	// 				h, -h, -h,
	// 				-h, -h, -h,
	// 				-h, -h, h,
	// 				-h, h, h,
	// 				-h, h, h,
	// 				h, h, h,
	// 				h, h, h,
	// 				h, -h, h,
	// 				h, -h, h,
	// 				-h, -h, h,
	// 				-h, -h, -h,
	// 				-h, -h, h,
	// 				-h, h, -h,
	// 				-h, h, h,
	// 				h, h, -h,
	// 				h, h, h,
	// 				h, -h, -h,
	// 				h, -h, h
	// 			 );
	// outlineGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
	// var lineSegments = new THREE.LineSegments( outlineGeometry, new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 10 } ) );
	// lineSegments.computeLineDistances();
	// glowScene.add( lineSegments );

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
		// color: 0x001822, 
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
	bloomPassGlow.renderToScreen = true;

	renderTargetGlow = new THREE.WebGLRenderTarget( SCREEN_WIDTH, SCREEN_HEIGHT, renderTargetParameters );
	glowComposer = new THREE.EffectComposer( renderer, renderTargetGlow );
	glowComposer.setSize( window.innerWidth, window.innerHeight );
	glowComposer.addPass( renderGlowScene );
	glowComposer.addPass( effectFXAAGlow );
	glowComposer.addPass( bloomPassGlow );
	glowComposer.addPass( new THREE.ShaderPass( THREE.CopyShader ) )

}

// Resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

	// Composer
	composer.setSize( window.innerWidth, window.innerHeight );
	effectFXAA.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight );

	// Glow
	glowComposer.setSize( window.innerWidth, window.innerHeight );
	effectFXAAGlow.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight );
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
	tesseractGlow.material.uniforms.viewVector.value = 
		new THREE.Vector3().subVectors( camera.position, tesseractGlow.position );
	var dt = clock.getDelta() * 0.5;
	// engine.update( dt * 0.5 );	
	// var sizes = particleGeometry.attributes.size.array;
	// var particles = particleGeometry.attributes.particle.array;
	// for ( var i = 0; i < num_particles; i++ ) {
	// 	sizes[ i ] = 10 * ( 1 + Math.sin( 0.1 * i + dt ) );
	// }
	// particleGeometry.attributes.size.needsUpdate = true;
	// particleGeometry.attributes.position.needsUpdate = true;

	// random move particle
	var pCount = num_particles;
  while (pCount--) {

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

	// fire update
	var t = clock.elapsedTime;
	// fire.update(t);
	// fire_rotate.update(t);


}
function render() 
{
	// renderer.render(glowScene, camera)
	glowComposer.render()
}