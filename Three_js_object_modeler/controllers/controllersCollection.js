import { buildingMaterial, buildingNotSelectedMaterial } from "../materials";


class ControllersCollection{
    constructor(controllers, LoD){
        this.controllers = controllers;
        this.LoD = LoD;
        this.selectedController = controllers.length-1;
        this.selectedMaterial = buildingMaterial;
    }

    getSelectedController(){
        if(this.selectedController!=-1){
            return this.controllers[this.selectedController];
        }
        else{
            return null;
        }
    }

    changeSelectedController(controllerId, dualScene){
        if(this.selectedController != -1){
            dualScene.remove(this.controllers[this.selectedController].dualController.vertexData);
            dualScene.remove(this.controllers[this.selectedController].dualController.dualPoints);

            this.controllers[this.selectedController].vertexData.material = buildingNotSelectedMaterial;
            this.selectedController = -1;
        }
        for(let i=0; i<this.controllers.length; i++){
            if(this.controllers[i].id==controllerId){
                this.selectedController = i;
                dualScene.add(this.controllers[i].dualController.vertexData);
                dualScene.add(this.controllers[i].dualController.dualPoints)
                
                this.controllers[this.selectedController].vertexData.material = this.selectedMaterial;
                break;
            }
            
        }
        
        
    }

    addController(controller, scene){
        this.controllers.push(controller);
        scene.add(controller.vertexData);
    }

    removeController(controllerId, scene){
        this.selectedController = -1;
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