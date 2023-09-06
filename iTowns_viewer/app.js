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
	/*itowns.Fetcher.json('http://www.itowns-project.org/itowns/examples/layers/JSONLayers/Ortho.json')
		.then(ortho => {
			var orthoSource = new itowns.WMTSSource(ortho.source);
			var orthoLayer = new itowns.ColorLayer('Ortho', {
				source: orthoSource,
			});
			view.addLayer(orthoLayer);
		});*/

	/*itowns.Fetcher.json('http://www.itowns-project.org/itowns/examples/layers/JSONLayers/Ortho.json')
		.then(ortho => {
			ortho.source.url = 'https://wxs.ign.fr/ortho/geoportail/r/wms'
			var orthoSource = new itowns.WMTSSource(ortho.source);
			var orthoLayer = new itowns.ColorLayer('Ortho', {
				source: orthoSource,
			});
			view.addLayer(orthoLayer);
		});*/


		var config = {};
		config.source = new itowns.WMTSSource({
			"url": "https://wxs.ign.fr/decouverte/geoportail/wmts",
			"crs": "EPSG:3857",
			"networkOptions": {
				"crossOrigin": "anonymous"
			},
			"format": "image/jpeg",
			"attribution": {
				"name": "IGN",
				"url": "http://www.ign.fr/"
			},
			"name": "ORTHOIMAGERY.ORTHOPHOTOS",
			"tileMatrixSet": "PM",
			"tileMatrixSetLimits": {
				"2": {
					"minTileRow": 0,
					"maxTileRow": 4,
					"minTileCol": 0,
					"maxTileCol": 4
				},
				"3": {
					"minTileRow": 0,
					"maxTileRow": 8,
					"minTileCol": 0,
					"maxTileCol": 8
				},
				"4": {
					"minTileRow": 0,
					"maxTileRow": 16,
					"minTileCol": 0,
					"maxTileCol": 16
				},
				"5": {
					"minTileRow": 0,
					"maxTileRow": 32,
					"minTileCol": 0,
					"maxTileCol": 32
				},
				"6": {
					"minTileRow": 1,
					"maxTileRow": 64,
					"minTileCol": 0,
					"maxTileCol": 64
				},
				"7": {
					"minTileRow": 3,
					"maxTileRow": 128,
					"minTileCol": 0,
					"maxTileCol": 128
				},
				"8": {
					"minTileRow": 7,
					"maxTileRow": 256,
					"minTileCol": 0,
					"maxTileCol": 256
				},
				"9": {
					"minTileRow": 15,
					"maxTileRow": 512,
					"minTileCol": 0,
					"maxTileCol": 512
				},
				"10": {
					"minTileRow": 31,
					"maxTileRow": 1024,
					"minTileCol": 0,
					"maxTileCol": 1024
				},
				"11": {
					"minTileRow": 62,
					"maxTileRow": 2048,
					"minTileCol": 0,
					"maxTileCol": 2048
				},
				"12": {
					"minTileRow": 125,
					"maxTileRow": 4096,
					"minTileCol": 0,
					"maxTileCol": 4096
				},
				"13": {
					"minTileRow": 2739,
					"maxTileRow": 4628,
					"minTileCol": 41,
					"maxTileCol": 7917
				},
				"14": {
					"minTileRow": 5478,
					"maxTileRow": 9256,
					"minTileCol": 82,
					"maxTileCol": 15835
				},
				"15": {
					"minTileRow": 10956,
					"maxTileRow": 18513,
					"minTileCol": 165,
					"maxTileCol": 31670
				},
				"16": {
					"minTileRow": 21912,
					"maxTileRow": 37026,
					"minTileCol": 330,
					"maxTileCol": 63341
				},
				"17": {
					"minTileRow": 43825,
					"maxTileRow": 74052,
					"minTileCol": 660,
					"maxTileCol": 126683
				},
				"18": {
					"minTileRow": 87648,
					"maxTileRow": 148111,
					"minTileCol": 1312,
					"maxTileCol": 253375
				},
				"19": {
					"minTileRow": 175296,
					"maxTileRow": 294063,
					"minTileCol": 170144,
					"maxTileCol": 343487
				},
				"20": {
					"minTileRow": 357008,
					"maxTileRow": 384687,
					"minTileCol": 524400,
					"maxTileCol": 540927
				},
				"21": {
					"minTileRow": 714032,
					"maxTileRow": 768783,
					"minTileCol": 1048816,
					"maxTileCol": 1081775
				}
			}
		});

		config.id = "Ortho";
		var layer = new itowns.ColorLayer(config.id, config);
		view.addLayer(layer);

	/*itowns.Fetcher.json('http://www.itowns-project.org/itowns/examples/layers/JSONLayers/IGN_MNT.json')
		.then(mnt => {
			var mntSource = new itowns.WMTSSource(mnt.source);
			var mntLayer = new itowns.ElevationLayer('IGN_MNT', {
				source: mntSource,
			});
			view.addLayer(mntLayer);
		});*/

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

//fetch(file).then(r => r.blob()).then(r =>fileReader.readAsArrayBuffer(r));






