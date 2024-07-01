class ControllersCollection{
    constructor(controllers, LoD){
        this.controllers = controllers;
        this.LoD = LoD;
        this.selectedController = controllers.length-1;
    }

    getSelectedController(){
        if(this.selectedController!=-1){
            return this.controllers[this.selectedController];
        }
        else{
            return null;
        }
    }

    changeSelectedController(controllerId){
        for(let i=0; i<this.controllers.length; i++){
            if(this.controllers[i].id==controllerId){
                this.selectedController = controllerId;
                break;
            }
        }
    }

    addController(controller){
        this.controllers.push(controller);
    }

    removeController(controllerId){
        this.selectedController = -1;
        for(let i=0; i<this.controllers.length; i++){
            if(this.controllers[i].id==controllerId){
                this.controllers.splice(i,1);
                i--;
            }
        }
    }
}