import { buildingMaterial, buildingNotSelectedMaterial, buildingMaterialDebug } from "../materials/materials";

// ne devrait pas exister
// chaque controleur devrait etre actif ou non
class ControllersCollection{
    static threeObjects = [];
    constructor(controllers, LoD, scene, dualScene, dualMaterial, dualPointsMaterial){
        this.controllers = controllers;
        this.LoD = LoD;
        this.selectedController = controllers.length-1;
        this.selectedMaterial = buildingMaterial;
        this.scene = scene;
        this.dualScene = dualScene;
        this.dualMaterial = dualMaterial;
        this.dualPointsMaterial = dualPointsMaterial;
    }

    /**
     * 
     * @returns {Controller}
     */
    getSelectedController(){
        if(this.selectedController!=-1){
            return this.controllers[this.selectedController];
        }
        else{
            return null;
        }
    }

    changeSelectedController(controllerId){
        if(this.selectedController != -1){
            this.dualScene.remove(this.controllers[this.selectedController].dualController.vertexData);
            this.dualScene.remove(this.controllers[this.selectedController].dualController.dualPoints);
            this.scene.remove(this.controllers[this.selectedController].labelData);
            this.controllers[this.selectedController].vertexData.material = buildingNotSelectedMaterial;
            this.selectedController = -1;
        }
        for(let i=0; i<this.controllers.length; i++){
            if(this.controllers[i].id==controllerId){
                this.selectedController = i;
                this.dualScene.add(this.controllers[i].dualController.vertexData);
                this.dualScene.add(this.controllers[i].dualController.dualPoints);
                this.scene.add(this.controllers[this.selectedController].labelData);
                
                this.controllers[this.selectedController].vertexData.material = this.selectedMaterial;
                //Pour la couleur des faces
                buildingMaterialDebug.uniforms.maxPointId.value = this.controllers[this.selectedController].pointData.count;
                buildingMaterialDebug.uniforms.maxFaceId.value = this.controllers[this.selectedController].faceData.count;

                buildingMaterial.uniforms.maxPointId.value = this.controllers[this.selectedController].pointData.count;
                buildingMaterial.uniforms.maxFaceId.value = this.controllers[this.selectedController].faceData.count;

                this.dualPointsMaterial.uniforms.maxPointId.value = this.controllers[this.selectedController].dualController.pointData.count;
                
                this.dualMaterial.uniforms.maxPointId.value = this.controllers[this.selectedController].pointData.count;
                this.dualMaterial.uniforms.maxFaceId.value = this.controllers[this.selectedController].faceData.count;

                break;
            }
            
        }
        
        
    }

    addController(controller){
        this.controllers.push(controller);
        this.scene.add(controller.vertexData);
        this.scene.add(controller.labelData);
        //console.log(controller.vertexData);
    }

    removeController(controllerId){
        //this.selectedController = -1;
        if(this.selectedController==controllerId){
            this.changeSelectedController(-1);
        }
        for(let i=0; i<this.controllers.length; i++){
            if(this.controllers[i].id==controllerId){
                this.controllers.splice(i,1);
                i--;
            }
        }
    }

    getVertexDataArray(){
        let vertexDataArray = [];
        this.controllers.forEach(controller => {
            vertexDataArray.push(controller.vertexData);
        });
        return vertexDataArray;
    }

    changeMaterial(newMaterial){
        this.selectedMaterial = newMaterial;
        this.controllers[this.selectedController].vertexData.material = this.selectedMaterial;
    }
}

export {ControllersCollection}