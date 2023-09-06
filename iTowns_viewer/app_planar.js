//const { PointCloudLayer } = require("itowns");


var viewerDiv = document.getElementById('viewerDiv');
/*var viewerDiv2 = document.getElementById('viewerDiv2');
var viewerDiv3 = document.getElementById('viewerDiv3');
var viewerDiv4 = document.getElementById('viewerDiv4');*/

//itowns.proj4.defs("EPSG:2154","+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
itowns.CRS.defs("EPSG:2154","+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");


var placement = {heading: 0.0, range: 100000, tilt:70.};

/*const xOrigin = 0;
const yOrigin = 7200000;

const xmin = 0;
const xmax = 1200000;
const ymin = 6090000;
const ymax = 7200000;

const resolution = 0.2;

const resolutionLv0 = resolution*(2**18);

const extent = new itowns.Extent(
	'EPSG:2154',
	xOrigin, xOrigin + (256 * resolutionLv0),
    yOrigin - (256 * resolutionLv0), yOrigin,
)*/

var extent/*Data*/ = new itowns.Extent(
    'EPSG:4326',
    -7.1567, 11.578,
	40.6712, 51.9948).as('EPSG:2154');

/*var tileMatrixLimit = {
	"tileMatrix":6,
	"minTileRow": 11,
	"maxTileRow": 14,
	"minTileCol": 0,
	"maxTileCol": 3
}

var extent = computeA0Tile(extentData, tileMatrixLimit, 'EPSG:2154')*/


view1 = init_view(viewerDiv, placement, extent);
view2 = init_view(viewerDiv2, placement, extent);
view3 = init_view(viewerDiv3, placement, extent);
view4 = init_view(viewerDiv4, placement, extent);

var ortho;
function init_view(viewerDiv, placement, extent){
	var view = new itowns.PlanarView(viewerDiv, extent, {placement: placement/*, minSubdivisionLevel: 0, maxSubdivisionLevel: 18*/});


	itowns.Fetcher.json('ortho_config_hr.json')
		.then(ortho => {
			console.log(ortho);
			var orthoSource = new itowns.WMTSSource(ortho);
			var orthoLayer = new itowns.ColorLayer('Ortho', {
				source: orthoSource,
			});
			view.addLayer(orthoLayer);
		});

	

	/*itowns.Fetcher.json('http://www.itowns-project.org/itowns/examples/layers/JSONLayers/IGN_MNT.json')
		.then(mnt => {
			mnt.source.crs='EPSG:2154';
			var mntSource = new itowns.WMTSSource(mnt.source);
			var mntLayer = new itowns.ElevationLayer('IGN_MNT', {
				source: mntSource,
			});
			view.addLayer(mntLayer);
		});*/

	/*var orthoConfig = {
		"url": "https://wxs.ign.fr/lambert93/geoportail/wmts",
		"service": "WMTS",
		"crs": "EPSG:2154",
		"networkOptions": {
			"crossOrigin": "anonymous"
		},
		"format": "image/jpeg",
		"name": "ORTHOIMAGERY.ORTHOPHOTOS.BDORTHO.L93",
		"tileMatrixSet": "LAMB93",
		"zoom":{
			"min":6,
			"max":18
		}
		
	}
	

	var orthoSource = new itowns.WMTSSource(orthoConfig);
	var orthoLayer = new itowns.ColorLayer('Ortho', {
		source: orthoSource,
	});
	ortho = orthoLayer;
	view.addLayer(orthoLayer);*/



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

		var camera = view1.camera.camera3D;

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
		controls.reset();
		console.log("loaded");


	});
}

fetch(file).then(r => r.blob()).then(r =>fileReader.readAsArrayBuffer(r));

function computeA0Tile(extent, tileMatrixLimit, crs){
	xMin = extent.west;
	xMax = extent.east;
	yMin = extent.south;
	yMax = extent.north;

	xTileSize = (xMax-xMin)/(tileMatrixLimit.maxTileRow-tileMatrixLimit.minTileRow);
	yTileSize = (yMax-yMin)/(tileMatrixLimit.maxTileCol-tileMatrixLimit.minTileCol);

	x0Min = xMin - tileMatrixLimit.minTileRow*xTileSize;
	y0Min = yMin - tileMatrixLimit.minTileCol*yTileSize;

	rowNumber = 2**tileMatrixLimit.tileMatrix;
	colNumber = rowNumber;

	x0Max = xMax + (rowNumber-tileMatrixLimit.maxTileRow)*xTileSize;
	y0Max = yMax + (colNumber-tileMatrixLimit.maxTileCol)*yTileSize;

	return extent = new itowns.Extent(
		crs,
		x0Min, x0Max,
		y0Min, y0Max);
}




