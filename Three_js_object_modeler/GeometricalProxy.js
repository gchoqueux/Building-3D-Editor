class PointData{
    constructor(points3D, nbAdjacentFaces){
        //this.tIndex = [];
        this.vIndex  = points3D;
        this.count   = points3D.length;
        this.moving = new Array(this.count);
        this.nbAdjacentFaces = nbAdjacentFaces;
        this.selectedPoint  = -1;


    }

    changeSelectedPoint(newPointIndex, material){
        this.selectedPoint = newPointIndex;
        material.uniforms.selectedPointId.value = newPointIndex;
        material.needsUpdate = true;
    }


    
}

class HalfEdgeData{
    constructor(eIndex, vIndex){
        this.eIndex = eIndex;
        this.vIndex = vIndex;
        this.count   = eIndex.length;
    }

    remove(id){
        this.eIndex[id]=null;
        this.vIndex[2*id]=null;
        this.vIndex[2*id+1]=null;
    }

    set(id, e_id, v_id){
        this.eIndex[id] = e_id;
        this.vIndex[2*id] = v_id[0];
        this.vIndex[2*id+1] = v_id[1];
    }

    reset(){
        this.eIndex = new Array(this.count);
        this.vIndex = new Array(2*this.count);
    }
}

class EdgeData{
    constructor(halfEdgeIndex){
        this.selectedId = -1;
        this.halfEdgeIndex  = halfEdgeIndex;
        this.count    = halfEdgeIndex.length/2;
        this.flipable = new Array(this.count).fill(false);
    }
    changeSelectedEdge(id, material){
        this.selectedId = id;
        material.uniforms.selectedEdgeId.value = this.selectedId;
        material.needsUpdate = true;
    }

    reset(){
        this.halfEdgeIndex = new Array(2*this.count);
        this.flipable = new Array(this.count).fill(false);;
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
        this.count         = tIndex.length;

    }

    changeSelectedFace(newFaceIndex, material){
        this.selectedFace = newFaceIndex;
        material.uniforms.selectedFaceId.value = this.selectedFace;
        material.needsUpdate = true;
    }

    update(){
        //On recalcule l'équation de plan
    }


}

class DualGraph{
    constructor(edges){
        this.edges 
    }
}

export {PointData, FaceData, HalfEdgeData, EdgeData};