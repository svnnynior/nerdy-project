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

// Composer
var effectFXAA, bloomPass, renderScene;
var composer;

var sphere;

// GLow
var glowScene, glowComposer;
var glowRenderer;
var effectFXAAGlow, bloomPassGlow, renderGlowScene;

// Particle with Line
var particlesData = [];
var positions, colors;
var particles;
var pointCloud;
var particlePositions;
var linesMesh;
var maxParticleCount = 500;
var particleCount = 400;
var r = 10;
var rHalf = r / 2;

var effectController = {
  showDots: true,
  showLines: true,
  minDistance: 2,
  limitConnections: true,
  maxConnections: 20,
  particleCount: 10
};

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
  // scene.add(tesseract);


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
  // Particle with Line
  // 
  var segments = maxParticleCount * maxParticleCount;
  positions = new Float32Array( segments * 3 );
  colors = new Float32Array( segments * 3 );
  var pMaterial = new THREE.PointsMaterial( {
    color: 0x010203,
		size: 20,
		map: new THREE.TextureLoader().load( "../images/particle/smokeparticle.png" ),
    blending: THREE.AdditiveBlending,
    transparent: true,
    sizeAttenuation: false,
    depthTest: false,
  } );
  particles = new THREE.BufferGeometry();
  particlePositions = new Float32Array( maxParticleCount * 3 );
  for ( var i = 0; i < maxParticleCount; i++ ) {

    pos_chance = Math.random()*10
    var x = Math.random() * r - r / 2;
    var y = Math.random() * r - r / 2;
    var z = Math.random() * r - r / 2;

		if (pos_chance < 1){
      x = x/2.2
      y = y/2.2
      z = z/2.2
		}else if (pos_chance < 4) {
			x = x/1.7
      y = y/1.7
      z = z/1.7
      // particle = new THREE.Vector3(pX, pY, pZ)
      // particle.bound = radius/1.7 - 1
		}else {
			x = x
      y = y
      z = z
		}

  
    particlePositions[ i * 3     ] = x;
    particlePositions[ i * 3 + 1 ] = y;
    particlePositions[ i * 3 + 2 ] = z;
    // add it to the geometry
    particlesData.push( {
      velocity: new THREE.Vector3( (-1 + Math.random() * 2) * 0.01, (-1 + Math.random() * 2) * 0.01,  (-1 + Math.random() * 2) * 0.01 ),
      numConnections: 0
    } );
  }
  particles.setDrawRange( 0, particleCount );
  particles.addAttribute( 'position', new THREE.BufferAttribute( particlePositions, 3 ).setDynamic( true ) );
  // create the particle system
  pointCloud = new THREE.Points( particles, pMaterial );
  scene.add( pointCloud );
  var geometry = new THREE.BufferGeometry();
  geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ).setDynamic( true ) );
  geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ).setDynamic( true ) );
  geometry.computeBoundingSphere();
  geometry.setDrawRange( 0, 0 );
  var material = new THREE.LineBasicMaterial( {
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    transparent: true
  } );
  linesMesh = new THREE.LineSegments( geometry, material );
  scene.add( linesMesh );


}

// Resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

  // Composer
	composer.setSize( window.innerWidth, window.innerHeight );
  effectFXAA.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight );
  
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
  
  // 
  // Particle
  // 
  var vertexpos = 0;
  var colorpos = 0;
  var numConnected = 0;
  for ( var i = 0; i < particleCount; i++ )
    particlesData[ i ].numConnections = 0;
  for ( var i = 0; i < particleCount; i++ ) {
    // get the particle
    var particleData = particlesData[i];
    particlePositions[ i * 3     ] += particleData.velocity.x;
    particlePositions[ i * 3 + 1 ] += particleData.velocity.y;
    particlePositions[ i * 3 + 2 ] += particleData.velocity.z;
    if ( particlePositions[ i * 3 + 1 ] < -rHalf || particlePositions[ i * 3 + 1 ] > rHalf )
      particleData.velocity.y = -particleData.velocity.y;
    if ( particlePositions[ i * 3 ] < -rHalf || particlePositions[ i * 3 ] > rHalf )
      particleData.velocity.x = -particleData.velocity.x;
    if ( particlePositions[ i * 3 + 2 ] < -rHalf || particlePositions[ i * 3 + 2 ] > rHalf )
      particleData.velocity.z = -particleData.velocity.z;
    if ( effectController.limitConnections && particleData.numConnections >= effectController.maxConnections )
      continue;
    // Check collision
    for ( var j = i + 1; j < particleCount; j++ ) {
      var particleDataB = particlesData[ j ];
      if ( effectController.limitConnections && particleDataB.numConnections >= effectController.maxConnections )
        continue;
      var dx = particlePositions[ i * 3     ] - particlePositions[ j * 3     ];
      var dy = particlePositions[ i * 3 + 1 ] - particlePositions[ j * 3 + 1 ];
      var dz = particlePositions[ i * 3 + 2 ] - particlePositions[ j * 3 + 2 ];
      var dist = Math.sqrt( dx * dx + dy * dy + dz * dz );
      if ( dist < effectController.minDistance ) {
        particleData.numConnections++;
        particleDataB.numConnections++;
        var alpha = 1.0 - dist / effectController.minDistance;
        positions[ vertexpos++ ] = particlePositions[ i * 3     ];
        positions[ vertexpos++ ] = particlePositions[ i * 3 + 1 ];
        positions[ vertexpos++ ] = particlePositions[ i * 3 + 2 ];
        positions[ vertexpos++ ] = particlePositions[ j * 3     ];
        positions[ vertexpos++ ] = particlePositions[ j * 3 + 1 ];
        positions[ vertexpos++ ] = particlePositions[ j * 3 + 2 ];
        colors[ colorpos++ ] = alpha;
        colors[ colorpos++ ] = alpha;
        colors[ colorpos++ ] = alpha;
        colors[ colorpos++ ] = alpha;
        colors[ colorpos++ ] = alpha;
        colors[ colorpos++ ] = alpha;
        numConnected++;
      }
    }
  }
  linesMesh.geometry.setDrawRange( 0, numConnected * 2 );
  linesMesh.geometry.attributes.position.needsUpdate = true;
  linesMesh.geometry.attributes.color.needsUpdate = true;
  pointCloud.geometry.attributes.position.needsUpdate = true;

}
function render() 
{
  // renderer.render(scene, camera)
  composer.render()
}