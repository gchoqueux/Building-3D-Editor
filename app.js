//const { PointCloudLayer } = require("itowns");

var viewerDiv = document.getElementById('viewerDiv');
var viewerDiv2 = document.getElementById('viewerDiv2');
var viewerDiv3 = document.getElementById('viewerDiv3');
var viewerDiv4 = document.getElementById('viewerDiv4');
var position = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };


view1 = init_view(viewerDiv, position);
view2 = init_view(viewerDiv2, position);
view3 = init_view(viewerDiv3, position);
view4 = init_view(viewerDiv4, position);


function init_view(viewerDiv, position){
	var view = new itowns.GlobeView(viewerDiv, position);
	itowns.Fetcher.json('https://www.itowns-project.org/itowns/examples/layers/JSONLayers/Ortho.json')
		.then(ortho => {
			var orthoSource = new itowns.WMTSSource(ortho.source);
			var orthoLayer = new itowns.ColorLayer('Ortho', {
				source: orthoSource,
			});
			view.addLayer(orthoLayer);
		});

	itowns.Fetcher.json('https://www.itowns-project.org/itowns/examples/layers/JSONLayers/IGN_MNT.json')
		.then(mnt => {
			var mntSource = new itowns.WMTSSource(mnt.source);
			var mntLayer = new itowns.ElevationLayer('IGN_MNT', {
				source: mntSource,
			});
			view.addLayer(mntLayer);
		});

	return view;
}



function sync(){
	var camera1 = view1.camera.camera3D;
	var camera2 = view2.camera.camera3D;
	var camera3 = view3.camera.camera3D;
	var camera4 = view4.camera.camera3D;

	var params2 = itowns.CameraUtils.getTransformCameraLookingAtTarget(view1, camera1);
	var params3 = itowns.CameraUtils.getTransformCameraLookingAtTarget(view1, camera1);
	var params4 = itowns.CameraUtils.getTransformCameraLookingAtTarget(view1, camera1);
	params2.tilt = 90;
	params3.tilt = params4.tilt = 5;
	params4.heading += 90;
	itowns.CameraUtils.transformCameraToLookAtTarget(view2, camera2, params2);
	itowns.CameraUtils.transformCameraToLookAtTarget(view3, camera3, params3);
	itowns.CameraUtils.transformCameraToLookAtTarget(view4, camera4, params4);
}


view1.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
	function globeInitialized(){
		sync();
		view1.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, sync);
		console.log("initialized");
	}
	);

function getParams(){
	var camera = view1.camera.camera3D;
	return itowns.CameraUtils.getTransformCameraLookingAtTarget(view1, camera);
}



// Adding a las file

file = "data_lidar/test.las";

var fileReader = new FileReader();

fileReader.onload = function onload(e){
	console.log("loaded");
	var data = e.target.result;
	console.log(data);
	itowns.LASParser.parse(data,{}).then(function _(geometry){

		console.log("parse");


		var material = new itowns.PointsMaterial();
		var points = new itowns.THREE.Points(geometry, material);
		points.frustumCulled = false;
		points.matrixAutoUpdate = false;
		points.updateMatrix();
		view1.scene.add(points);
		points.updateMatrixWorld(true);

		/*var camera = view1.camera.camera3D;

		var lookAt = new itowns.THREE.Vector3();
		var size = new itowns.THREE.Vector3();
		geometry.boundingBox.getSize(size);
		geometry.boundingBox.getCenter(lookAt);

		camera.far = Math.max(2.0 * size.length(), camera.far);

		var position = geometry.boundingBox.min.clone().add(size.multiply({ x: 0, y: 0, z: size.x / size.z }));

		camera.position.copy(position);
		camera.lookAt(lookAt);

		controls.options.moveSpeed = size.length();

		view1.notifyChange(camera);
		controls.reset();*/
		console.log("loaded");


	});
}

fetch(file).then(r => r.blob()).then(r =>fileReader.readAsArrayBuffer(r));






