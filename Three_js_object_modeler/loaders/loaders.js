import { CityJSONLoader, CityJSONParser, CityJSONWorkerParser } from "cityjson-threejs-loader";
import { GeometryBuilder } from "../Builders/GeometryBuilders";
import { CityJSONModelBuilder, MockModelBuilder } from "../Builders/ModelBuilder";
import { buildingMaterial, buildingMaterialDebug, dualMaterial, pointsMaterial } from "../materials/materials";



class Loader{
    constructor(){

    }

    loadObject(objectData, controllers){

    }

    loadObjectGraphics(objectData, scene){

    }
    loadObjectModel(objectData, controllers){

    }
}


class MockObjectLoader extends Loader{
    constructor(){
        super();
    }

    loadObject(mockJSObject, controllers){
        let modelBuilder = new MockModelBuilder();
        let buildingsJs = mockJSObject;
        buildingsJs.forEach(
            building=>{
                modelBuilder.build(building);
            }
        )
        let buildingsModel = modelBuilder.getBuildings();

        let geometryBuilder = new GeometryBuilder();
        console.log(buildingsModel);
        buildingsModel.forEach(building=>{
            geometryBuilder.build(building, 3);
            let geometricalController = geometryBuilder.getScene(buildingMaterial);
            geometricalController.buildDual(dualMaterial, pointsMaterial);
            controllers.addController(geometricalController);
            controllers.changeSelectedController(geometricalController.id);
        })
        
        //Pour le debug graphique
        buildingMaterialDebug.uniforms.maxPointId.value = controllers.getSelectedController().pointData.count;
        buildingMaterialDebug.uniforms.maxFaceId.value = controllers.getSelectedController().faceData.count;
    }
}


class CityJSONObjectLoader extends Loader{
    constructor(){
        super();
        this.parser = new CityJSONParser();
        //this.parser.chunkSize = 2000;
        this.loader = new CityJSONLoader(this.parser);
        this.loader.computeMatrix({'vertices' : [[0,0,0]]})
    }

    loadObjectGraphics(cityJSON_Data, scene){
        this.loader.load(cityJSON_Data);
        return this.loader.scene;

    }
    loadObjectModel(cityJSON_Data, controllers){
        let cityJSONbuilder = new CityJSONModelBuilder();
        cityJSONbuilder.build(cityJSON_Data);
        let buildings = cityJSONbuilder.getBuildings();
        //console.log(buildings);
        let geometryBuilder = new GeometryBuilder();
        buildings.forEach(building=>{
            try{
                console.log(building);
                geometryBuilder.build(building,3);//TO DO : Gérer le LOD
                console.log(geometryBuilder);
                let geometricalController = geometryBuilder.getScene(buildingNotSelectedMaterial);
                geometricalController.buildDual(dualMaterial, pointsMaterial);
                console.log(geometricalController);
                controllers.addController(geometricalController);
                controllers.changeSelectedController(geometricalController.id);
            }
            catch(error){
                console.error("Failed to import the building "+building.id+" because of "+error);
            }
        })
        console.log(controllers.getSelectedController());
        console.log("IMPORT SUCCEED");
    }

    
}

let loaders = {"MockLoader":new MockObjectLoader() ,"CityJSONLoader":new CityJSONObjectLoader()};





export{loaders}