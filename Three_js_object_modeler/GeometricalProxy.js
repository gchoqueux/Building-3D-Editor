class PointData{
    constructor(points3D){
        //this.tIndex = [];
        this.vIndex  = points3D;
        this.count   = points3D.length;
        this.moving = new Array(this.count);


    }
    
}

class EdgeData{
    constructor(){
        this.selected = [];
        this.hfIndex  = [];
        this.count    = 0;
    }


}

class FaceData{
    constructor(tIndex, planeEquation, center){
        this.color         = [];
        this.tIndex        = tIndex;
        this.opacity       = [];
        this.selectedFace  = -1;
        this.count         = tIndex.length;
        this.planeEquation = planeEquation;
        this.center        = center;

    }

    changeSelectedFace(newFaceIndex, material){
        if (this.selectedFace!=newFaceIndex){
            
            this.selectedFace = newFaceIndex;
            material.uniforms.selectedFaceId.value = this.selectedFace;
            material.needsUpdate = true;
        }
        

    }

    update(){
        //On recalcule l'équation de plan
    }


}

export {PointData, FaceData};