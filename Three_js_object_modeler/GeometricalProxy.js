class PointData{
    constructor(points3D, heIndex, nbAdjacentFaces){
        //topological model
        this.coords  = points3D;
        this.heIndex = heIndex;
        this.count   = points3D.length;

        //grapphical embedding
        this.nbAdjacentFaces = nbAdjacentFaces;
        this.selectedPoint  = -1;
        //this.moving = new Array(this.count);


    }
    add(he_id){
        this.coords.push([0,0,0]);
        this.heIndex.push(he_id);
        this.nbAdjacentFaces.push(-1);
        this.count+=1;
    }

    getAdjacentHalfEdges(p_id, he_data){
        let halfEdges = [];
        let current = this.heIndex[p_id];
        do{
            halfEdges.push(current);
            let opp_he = he_data.opposite(current)
            halfEdges.push(opp_he);
            current = he_data.next(opp_he);
        }while(current!=this.heIndex[p_id])
        return halfEdges;
    }

    changeSelectedPoint(newPointIndex, material){
        this.selectedPoint = newPointIndex;
        material.uniforms.selectedPointId.value = newPointIndex;
        material.needsUpdate = true;
    }


    
}

class HalfEdgeData{
    constructor(pIndex, oppIndex, nextIndex, fIndex, eIndex){
        this.pIndex    = pIndex;
        this.oppIndex  = oppIndex;
        this.nextIndex = nextIndex;
        this.fIndex    = fIndex;
        this.eIndex    = eIndex;
        this.count     = pIndex.length;
    }
    add(p_id, opp_id, next_id, f_id, e_id){
        this.pIndex.push(p_id);
        this.oppIndex.push(opp_id);
        this.nextIndex.push(next_id);
        this.fIndex.push(f_id);
        this.eIndex.push(e_id);
        this.count+=1;
    }
    next(he_id){
        return(this.nextIndex[he_id]);
    }
    opposite(he_id){
        return(this.oppIndex[he_id]);
    }
    vertex(he_id){
        return(this.pIndex[he_id]);
    }

    previous(he_id){
        let he = this.next(he_id);
        while(this.next(he)!=he_id){
            he = this.next(he);
        }
        return he;
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
    constructor(heIndex){
        this.heIndex = heIndex;
        this.count = this.heIndex.length;
        this.selectedEdge = -1;
        this.flipable = new Array(this.count).fill(false);
    }
    changeSelectedEdge(newEdgeIndex, material){
        this.selectedEdge = newEdgeIndex;
        material.uniforms.selectedEdgeId.value = newEdgeIndex;
        material.needsUpdate = true;
    }
    add(he_id){
        this.heIndex.push(he_id);
        this.flipable.push(false);
        this.count+=1;
    }
}




class FaceData{
    constructor(planeEquation, hExtIndex, hIntIndices){
        //Topological && geometrical data
        this.planeEquation = planeEquation;
        this.hExtIndex     = hExtIndex;
        this.hIntIndices   = hIntIndices;
        this.count         = planeEquation.length;

        //Graphical embedding
        this.selectedFace  = -1;
        this.color         = [];
        this.opacity       = [];

    }

    getExterior(he_data){
        let exterior = [];
        let current_he = this.hExtIndex;
        do{
            exterior.push(current_he);
            current_he = he_data.next(current_he);
        }while(current_he!=this.hExtIndex)
        return exterior;
    }

    getInteriors(he_data){
        let interiors = [];
        this.hIntIndices.forEach(he_int=>{
            let interior = [];
            let current_he = he_int;
            do{
                interior.push(current_he);
                current_he = he_data.next(current_he);
            }while(current_he!=this.hExtIndex)
            interiors.push(interior);
        })
        return interiors;
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