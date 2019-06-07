var outline_shader = {
	uniforms: {
			"linewidth":  { type: "f", value: 0.5 },
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

	// POST
	renderScene = new THREE.RenderPass( scene, camera );
	effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 0.02, 0.5, 0.2);
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
	// var wireframeMat = new THREE.MeshBasicMaterial({
	// 	color : new THREE.Color(0xffffff),
	// 	wireframe : true
	// });

	// var fireTex = new THREE.TextureLoader().load("../images/resources/BlueFire.png");
	// fire = new THREE.Fire(fireTex, new THREE.Color( 0x00ffff ), 0);
	// fire.position.set(0, 0.3, 0);
	// var wireframe = new THREE.Mesh(fire.geometry, wireframeMat.clone());
	// fire.add(wireframe);
	// wireframe.visible = true;
	// wireframe.visible = false;
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
	// glowScene.add( outlineTesseract );

	var blackTesseractGeometry = new THREE.BoxGeometry(15,15,15);
	var blackTesseractMaterial = new THREE.MeshBasicMaterial( { 
		// color: 0x001822, 
		color: 0x22ccff
	});
	var blackTesseract = new THREE.Mesh( blackTesseractGeometry, blackTesseractMaterial );
	blackTesseract.position.set(0,0,0);
	// glowScene.add( blackTesseract )

}

// Resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

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

}
function render() 
{
	renderer.render(glowScene, camera)
}