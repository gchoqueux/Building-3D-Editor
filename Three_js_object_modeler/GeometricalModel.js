import * as utils from'./utils.js';

class GeometricalModel{
    constructor(positions, index=null){
        this.trianglesMergingThreshold = 2;
        this.faces = [];
        this.triangles = [];
        this.pointsIndex = [];

        //Calcul de l'index de points
        //On parcours les points du vertexBuffer
        for (var i=0; i<positions.count; i++){
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            var j=0;
            //On regarde si le point a déjà été rencontré
            while (j<this.pointsIndex.length && (x!=this.pointsIndex[j].coord.x || y!=this.pointsIndex[j].coord.y || z!=this.pointsIndex[j].coord.z)){
                j++;
            }
            //Si il n'a jamais été rencontré, on le crée dans l'index
            if (j==this.pointsIndex.length){
                this.pointsIndex.push({'coord' : {'x':x, 'y':y, 'z':z}, 'index':[i]})
            } 
            //Si il a déjà été rencontré, on l'ajoute à l'index déjà existant
            else{
                this.pointsIndex[j].index.push(i);
            }
        }

        //Calcul de la liste des triangles
        for (var i=0; i<positions.count/3; i++){
            const p1 = positions.getXYZ(3*i);
            const p2 = positions.getXYZ(3*i+1);
            const p3 = positions.getXYZ(3*i+2);

            var index1 = this.getPointIndex(p1);
            var index2 = this.getPointIndex(p2);
            var index3 = this.getPointIndex(p3);

            this.triangles.push({'vertices' : [index1, index2, index3]});
        }

        //Calcul des faces
        this.faces = [];
        for (let i=0; i<this.triangles.length; i++){
            let t  = this.triangles[i];
            let p1 = this.pointsIndex[t.vertices[0]].coord;
            let p2 = this.pointsIndex[t.vertices[1]].coord;
            let p3 = this.pointsIndex[t.vertices[2]].coord;

            let t_array = [[p1.x, p1.y, p1.z],[p2.x, p2.y, p2.z],[p3.x, p3.y, p3.z]];

            const planParameters = utils.getPlanEquation(t_array);

            var planAlreadyExists = false;
            //TODO : passer à de la classification
            for(let j=0; j<this.faces.length; j++){
                const params = this.faces[j].parameters;
                if(utils.distance_Tr_Pl(t_array,[params.a, params.b, params.c, params.d])<this.trianglesMergingThreshold){
                    this.faces[j].trianglesIndices.push(i);
                    planAlreadyExists = true;
                    //TODO : recalculer l'équation de plan comme la moyenne de équations de plans
                    break;
                }
            }
            if(!planAlreadyExists){
                this.faces.push({'parameters':{'a':planParameters[0], 'b': planParameters[1], 'c':planParameters[2], 'd':planParameters[3]}, trianglesIndices:[i]});
            }
        }


    }

    getPointIndex(v){
        for(let i=0; i<this.pointsIndex.length; i++){
            let p = this.pointsIndex[i];
            let v_p = [p.coord.x,p.coord.y,p.coord.z];
            if(utils.equals_vec(v, v_p)){
                return i;
            }
        }
        return -1;
    }

    addVertex(v, position){
        var known = false;
        this.pointsIndex.forEach(
            p=>{
                if(p.coord.x==v[0] && p.coord.y==v[1] && p.coord.z==v[2]){
        
                    known = true;
                    p.index.push(position);
                }
            }
        )
        if(!known){
            this.pointsIndex.push({'coord':{'x':v[0], 'y':v[1], 'z':v[2]}, index:[position]});
        }
    }

    getFaceFromGLVertex(v){
        let result = -1;
        for(let i=0; i<this.faces.length; i++){
            this.faces[i].trianglesIndices.forEach(t_i=>{
                this.triangles[t_i].vertices.forEach(t_v_i=>{
                    let t_v = this.pointsIndex[t_v_i];
                    t_v = [t_v.coord.x,t_v.coord.y,t_v.coord.z];
                    if (utils.equals_vec(v, t_v)){
                        result = i;
                    } 
                })
            })
        }
        return result;
    }

    getFaceFromGLTriangle(j){
        let result = -1;
        for(let i=0; i<this.faces.length; i++){
            this.faces[i].trianglesIndices.forEach(t_i=>{
                if(t_i==j){
                    result = i;
                }
            })
        }
        return result;
    }

    getFaceFromGLTriangleIndices(i1,i2,i3){
        let result = -1;
        for(let i=0; i<this.faces.length; i++){
            this.faces[i].trianglesIndices.forEach(t_i=>{
                let tr = this.triangles[t_i].vertices;
                let glPoints = this.pointsIndex[tr[0]].index;
                glPoints = glPoints.concat(this.pointsIndex[tr[1]].index);
                glPoints = glPoints.concat(this.pointsIndex[tr[2]].index);

                if(glPoints.indexOf(i1)!=-1 && glPoints.indexOf(i2)!=-1 && glPoints.indexOf(i3)!=-1){
                    result=i;
                }
            })
        }
        return result;
    }
    

}

export{GeometricalModel};