import { normalize } from 'three/src/math/MathUtils';
import * as Utils from './utils/utils'
import matrix, * as Matrix from "matrix-js"
import * as THREE from 'three';
import Earcut from "earcut";

class Point3D{
    static maxId = 0;
    constructor(x,y,z){
        this.x=x;
        this.y=y;
        this.z=z;
        this.id = Point3D.maxId;
        Point3D.maxId+=1;
    }
    toString(){
        return "P3D("+this.x+","+this.y+","+this.z+")";
    }
}

class LinearRing{
    static epsilon = 1;
    constructor(positions){
        this.positions = positions;
        this.size = positions.length;
        this.planeEquation=[0,0,0,0];
        //checkValidity calcul aussi l'equation de plan et la mets à jour
        if(!this.checkValidity()){
            console.error("Linear ring not valid");
        }
        
    }

    find(id_point){
        let p = null;
        this.positions.forEach(point3D=>{
            if(id_point==point3D.id){
                p = point3D;
            }
        })
        //console.log(id_point, this.positions);
        return p;
    }

    addPoint(point){
        this.positions.push(point);
        if(this.checkValidity()){
            this.size+=1;
        }
        else{
            this.positions.pop();
            console.error("Linear ring not valid, impossible to add the point " + point.toString());
        }
    }

    insertPoint(point, i){
        if(i>this.size && i<0){
            console.error("Bad position argument, can not insert the point "+point.toString()+" in the LinearRing");
        }
        else{
            this.positions.splice(i, 0, point);
            if(this.checkValidity()){
                this.size+=1;
            }
            else{
                this.positions.pop();
                console.error("Linear ring not valid, impossible to insert the point " + point.toString());
            }
        }
    }

    getPoint(i){
        if(i>this.size && i<0){
            console.error("Bad position argument, can not get the point "+i+" in the LinearRing");
        }
        return(this.positions[i]);
    }

    checkValidity(){
        if(this.size == 0){
            return true;
        }
        let tested = false; // Tested permet de savoir si au moins un des triangles était valide
        for(let i=0; i<this.size-2; i++){
            for(let j=i+1; j<this.size-1; j++){
                for(let k=j+1; k<this.size; k++){
                    let [p1,p2,p3] = [this.positions[i], this.positions[j], this.positions[k]];
                    
                    //On réoriente le triangle si il n'est' pas dans le sens trigonométrique.

                    let orientation = Utils.orientation([p1.x, p1.y, p1.z],[p2.x, p2.y, p2.z],[p3.x, p3.y, p3.z]);
                    if (orientation<0){
                        let mem = p2;
                        p2 = p3;
                        p3 = mem;
                    }
                    
                    
                    
                    let v1 = [p2.x-p1.x,p2.y-p1.y,p2.z-p1.z];
                    let v2 = [p3.x-p1.x,p3.y-p1.y,p3.z-p1.z];
                    
                    let alpha = Utils.angle(v1,v2);
                    if (alpha<=0.1){
                        break;
                    }
                    else{
                        tested = true;
                        let n = Utils.normalize(Utils.crossProduct(v1,v2));
                        let [a,b,c] = n;
                        
                        let d = -a*p1.x-b*p1.y-c*p1.z;

                        this.planeEquation = [a,b,c,d];
                        

                        this.positions.forEach(p=>{
                            let dist = Utils.distance_Point_Pl([p.x,p.y,p.z], [a,b,c,d]);
                            if (dist>this.epsilon){
                                return false;
                            }
                        })
                    }

                    
                }  
            }    
        }
        return tested;
    }

}

class Surface{
    constructor(){

    }

    checkValidity(){
        return true;
    }
}

class Polygon extends Surface{
    static maxId = 0;
    static epsilon = 1;
    constructor(interior, exterior){
        super();
        this.interior = interior;
        this.exterior = exterior;
        this.id = Polygon.maxId;
        Polygon.maxId+=1;
        this.triangulation = [];
        this.planeEquation = [0,0,0,0];
        //check validity mets à jour l'équation de plan
        if(this.checkValidity()){
            this.triangulate();
        }
        else{
            console.error("Polygon not valid");
        }
        
    }
    checkValidity(){
        
        let valid = (this.exterior.size != 0) && this.exterior.checkValidity();
        let plan1 = this.exterior.planeEquation;
        if(this.interior.size != 0){
            valid = valid && this.interior.checkValidity();
            let plan2 = this.interior.planeEquation;

            if (this.id==32){
            }

            if(Utils.distance_Pl_Pl(plan1, plan2)<=Polygon.epsilon){
                this.planeEquation = [(plan1[0]+plan2[0])/2, (plan1[1]+plan2[1])/2,(plan1[2]+plan2[2])/2,(plan1[3]+plan2[3])/2]
                valid = true;
            }
            else{
                valid = false;
            }
        }
        else{
            this.planeEquation = this.exterior.planeEquation;
        }
        return valid;
    }
    triangulate(){
        
        if (this.id==32){
            console.log(this.planeEquation);
        }
        let points = this.exterior.positions.concat(this.interior.positions);
        

        let pointsCoordinates = [];
        points.forEach(point3D=>{
            pointsCoordinates = pointsCoordinates.concat([point3D.x, point3D.y, point3D.z]);
        })
        let holes=null;
        if(this.interior.size!=0){
            holes = [this.exterior.size];
            if(this.id == 32){
                console.log(points,holes);
            }
        }
        
        if(this.planeEquation[2]!=0){  
            this.triangulation = Earcut(pointsCoordinates, holes, 3);
        }
        //Si la face est verticale, il faut la rendre horizontale
        else{
            let M = this.computeToHorizontalMatrix();
            for(let i=0; i<pointsCoordinates.length/3; i++){
                let pt = matrix([[pointsCoordinates[3*i]], [pointsCoordinates[3*i+1]], [pointsCoordinates[3*i+2]],[1]]);
                let h_pt = matrix(M.prod(pt));
                pointsCoordinates[3*i    ] = h_pt(0,0);
                pointsCoordinates[3*i + 1] = h_pt(1,0);
                pointsCoordinates[3*i + 2] = h_pt(2,0);
            }
            this.triangulation = Earcut(pointsCoordinates, holes, 3);
            //console.log(this.triangulation);
            if (this.id==32){
                console.log(pointsCoordinates);
            }
        }

        //On réoriente les triangles si ils ne sont pas dans le sens trigonométrique.
        for (let i=0; i<this.triangulation.length/3; i++){
            let p1 = points[this.triangulation[3*i  ]];
            let p2 = points[this.triangulation[3*i+1]];
            let p3 = points[this.triangulation[3*i+2]];
            let orientation = Utils.orientation([p1.x, p1.y, p1.z],[p2.x, p2.y, p2.z],[p3.x, p3.y, p3.z]);
            if (orientation<0){
                let mem = this.triangulation[3*i+1];
                this.triangulation[3*i+1] = this.triangulation[3*i+2];
                this.triangulation[3*i+2] = mem;
            }
        }
        
        
        

        //On remplace la valeur représentant les points (indice dans le tableau positions) par leur indice (attribut de l'objet point3D)
        
        for (let i=0; i<this.triangulation.length; i++){
            this.triangulation[i]=points[this.triangulation[i]].id;
        }
    }
    find(id_point){

        let point = this.exterior.find(id_point);
        if (!point){
            point = this.interior.find(id_point);
        }
        return point;
    }



    //Specific utils function
    computeToHorizontalMatrix(){
        let [a,b,c,d] = this.planeEquation;
        let d2, d1, u,v;
        if(b!=0){
            [u,v] = [1, -a/b];
            d2 = -d/b;
            d1 = 0;
        }
        else{
            [u,v] = [-b/a, 1];
            d2 = 0;
            d1 = -d/a;
        }
        

        let Mr = matrix([
            [u  , u*v,v  , 0],
            [u*v, v*v,-u , 0],
            [-v , u  ,0  , 0],
            [0  , 0  ,0  , 1]
        ])
        return Mr;
    }

}

class MultiSurface{
    constructor(surfaces){
        this.surfaces=surfaces;
        this.size = this.surfaces.length;
    }
    add(surface){
        this.surfaces.push(surface);
        this.size+=1;
    }
    checkValidity(){
        //check that the surface define a closed volume
        return true;
    }


}



export {Surface, Point3D, Polygon, LinearRing, MultiSurface}
