import { GreaterEqualDepth } from "three";
import * as GeomUtils from './utils/3DGeometricComputes'
import * as Utils from "./utils/utils";




/**
 * 
 * @param {Controller} geometricalController 
 * @param {int} faceId 
 * @returns boolean : True if the face contains an auto intersection
 */
function autoIntersects(geometricalController, faceId){
    //console.log("autoIntersects f : ", faceId);
    let [exterior, interiors] = geometricalController.getFaceBorders(faceId);
    let borders = [exterior];
    borders.push(...interiors);

    let bordersCoords = [];
    borders.forEach(border=>{
        bordersCoords.push(...geometricalController.computeBorderCoords(border));
    })


    return GeomUtils.checkAutoIntersection(bordersCoords);
}


/**
 * 
 * @param {Controller} geometricalController 
 * @param {int} faceId 
 * @returns boolean : True if the face contains an auto intersection
 */
function pointsWellDefined(geometricalController, faceId){
    let valid = false;
    //console.log("points orbit f : ", faceId);
    let [exterior, interiors] = geometricalController.getFaceBorders(faceId);
    let points = exterior;

    interiors.forEach(interior=>{
        points = Utils.mergeListsWithoutDoubles(points, interior);
    })

    for(let i=0; i<points.length; i++){
        let p=points[i];
        let faces = geometricalController.findAdjacentFaces(p);
        let plans = [];

        faces.forEach(f=>{
            plans.push(geometricalController.faceData.planeEquation[f]);
        })

        let coords = GeomUtils.computeIntersectionPoint(...plans);
        /*if(faceId==9){
            console.log(p, faces);
            GeomUtils.computeIntersectionPoint2(...plans)
        }*/
        
        valid = !(isNaN(coords[0])||isNaN(coords[1])||isNaN(coords[2]))
        if(!valid){
            //console.log("-----------",plans, coords);
            break;
        }
    }
    return valid;
}

/**
 * 
 * @param {*} geometricalController 
 * @param {*} edge_id 
 * @returns a boolean saying if removing the edge creates a degenerated face
 */
function faceDegenerated(geometricalController, edge_id){
    let valid = true;
    let he1 = geometricalController.edgeData.heIndex[edge_id];
    let he2 = geometricalController.halfEdgeData.opposite(he1);

    let face1 = geometricalController.halfEdgeData.fIndex[he1];
    let face2 = geometricalController.halfEdgeData.fIndex[he2];

    let f1Borders = [...geometricalController.faceData.hIntIndices[face1]];
    let f2Borders = [...geometricalController.faceData.hIntIndices[face2]];
    f1Borders.push(...geometricalController.faceData.hExtIndex[face1]);
    f2Borders.push(...geometricalController.faceData.hExtIndex[face2]);
    /*console.log(he1, he2);
    console.log(f1Borders, f2Borders);*/
    let degenerated_face = -1;
    for(let i=0; i<f1Borders.length; i++){
        let h = f1Borders[i];
        let h_0 = h;
        let he1_visited = false;
        let n=0;
        do{
            h = geometricalController.halfEdgeData.next(h);
            he1_visited = he1_visited||(h==he1);
            //console.log("==>",h, he1, h==he1);
            n++;
        }while(h_0!=h)
        if(he1_visited){
            //console.log(n);
            valid = (n>=4);
            break;
        }
    }
    if(valid){
        for(let i=0; i<f2Borders.length; i++){
            let h = f2Borders[i];
            let h_0 = h;
            let he2_visited = false;
            let n=0;
            do{
                h = geometricalController.halfEdgeData.next(h);
                he2_visited = he2_visited||(h==he2);
                //console.log("==>",h, he2, h==he2);
                n++;
            }while(h_0!=h)
            if(he2_visited){
                //console.log(n);
                valid = (n>=4);
                break;
            }
        }
        if(!valid){
            degenerated_face = face2;
        }
    }
    else{
        degenerated_face = face1;
    }
    

    return degenerated_face;
}

export{autoIntersects, pointsWellDefined, faceDegenerated}