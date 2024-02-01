import matrix from "matrix-js";
import * as Utils from './utils';
import { normalize } from "three/src/math/MathUtils";
import Earcut from "earcut";


function crossMatrix(v){
    let [x,y,z] = v;
    return[[ 0, -z,  y],
           [ z,  0, -x],
           [-y,  x,  0]];
}

/**
 * 
 @param  {...float[][]} lines : the lines parameters, defined like this : [[origin coord],[direction vector]] (vector should be normalized)
 * @returns The coordinates of the closest point to the N lines
 */
function findClosestPointToNLines(...lines){
    let W0 = matrix([[0,0,0],
                     [0,0,0],
                     [0,0,0]]);
    let W1 = matrix([[0],
                     [0],
                     [0]]);

    lines.forEach(line => {
        let [[x_o, y_o, z_o], [x,y,z]] = line;
        let cm_v = matrix(crossMatrix([x,y,z]));
        let W0_i = matrix(matrix(cm_v.trans()).prod(cm_v));
        W0 = matrix(W0.add(W0_i));

        let Pi = matrix([[x_o],
                         [y_o],
                         [z_o]]);
        let W1_term = matrix(W0_i.prod(Pi));
        W1 = matrix(W1.add(W1_term));
    });

    return matrix(W0.inv()).prod(W1);
}

/**
 * 
 * @param {float[]} point 
 * @param {float[][]} line : the line parameters, defined like this : [[origin coord],[direction vector]] (vector should be normalized)
 */
function projectPointOnLine(point, line){
    let [x_p, y_p, z_p] = point;
    let [[x_o, y_o, z_o], v] = line;
    v = Utils.normalize(v);

    let OP = [x_p-x_o, y_p-y_o, z_p-z_o];
    let norme = Utils.dotProduct(OP,v);
    return [x_o+norme*v[0],y_o+norme*v[1],z_o+norme*v[2]];
}

/**
 * 
 * @param {Array} plan1 The first plan's equation coefficients
 * @param {Array} plan2 The second plan's equation coefficients
 * @param {Array} plan3 The third plan's equation coefficients
 * @returns The intersection point of the 3 plans (if this point exists).
 */
function computeIntersectionPoint(plan1,plan2,plan3){
    let [a1,b1,c1,d1] = plan1;
    let [a2,b2,c2,d2] = plan2;
    let [a3,b3,c3,d3] = plan3;

    let A = matrix([[a1,b1,c1],
                    [a2,b2,c2],
                    [a3,b3,c3]]);


    //console.log(A.det());
    if(Math.abs((A.det()))<=0.01){
        return [NaN,NaN,NaN];
    }

    let D = matrix([[-d1],
                    [-d2],
                    [-d3]]);

    let p = matrix(A.inv()).prod(D);
    p = matrix(p).trans()[0];

    return p;
}

/**
 * Calcule la valeur de t (t étant la valuer du shift du plan mobile) pour laquelle le trinagle
 * définit par les 4 plans s'applatit. 
 * @param {Array} planMobile Equation de plan du plan mobile 
 * @param {Array} plan1 Equation de plan du plan fixe 1
 * @param {Array} plan2 Equation de plan du plan fixe 2
 * @param {Array} plan3 Equation de plan du plan fixe 3
 */
function computeShiftTValidity(planMobile, plan1, plan2, plan3){
    let [a_4,b_4,c_4,d_4] = planMobile;
    let [a_1,b_1,c_1,d_1] = plan1;
    let [a_2,b_2,c_2,d_2] = plan2;
    let [a_3,b_3,c_3,d_3] = plan3;

    let num = ((a_1*b_2-a_2*b_1)*c_3+(a_3*b_1-a_1*b_3)*c_2+(a_2*b_3-a_3*b_2)*c_1)*d_4+((a_2*b_1-a_1*b_2)*c_4+(a_1*b_4-a_4*b_1)*c_2+(a_4*b_2-a_2*b_4)*c_1)*d_3+((a_1*b_3-a_3*b_1)*c_4+(a_4*b_1-a_1*b_4)*c_3+(a_3*b_4-a_4*b_3)*c_1)*d_2+((a_3*b_2-a_2*b_3)*c_4+(a_2*b_4-a_4*b_2)*c_3+(a_4*b_3-a_3*b_4)*c_2)*d_1;
    let den = ((a_1*b_2-a_2*b_1)*c_3+(a_3*b_1-a_1*b_3)*c_2+(a_2*b_3-a_3*b_2)*c_1);
    let t=0;

    //console.log(num, den);
    if (den == 0){
        if(num>=0){
            t=Infinity;
        }
        else{
            t=-Infinity;
        }
    }
    else{
        t = num/den;
    }
     
    return t;

}




function computeToHorizontalMatrix(planeEquation){
    let [a,b,c,d] = planeEquation;
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


/**
 * 
 * @param {Array[Array[float]]} exterior 
 * @param {Array[Array[float]]} interior 
 * @param {Array[float]} planeEquation 
 * @returns The array of indices 
 */
function triangulate(exterior, interior, planeEquation){
    let holes=null;
    let pointsCoordinates = [];
    exterior.forEach(pt=>{
        let [x,y,z] = pt;
        pointsCoordinates.push(x,y,z);
    });
    interior.forEach(pt=>{
        let [x,y,z] = pt;
        pointsCoordinates.push(x,y,z);
    });
    if(interior.length!=0){
        holes = [exterior.length];
    }


    let triangulation;

    if(planeEquation[2]!=0){  
        triangulation = Earcut(pointsCoordinates, holes, 3);
    }
    else{
        let M = computeToHorizontalMatrix(planeEquation);
        for(let i=0; i<pointsCoordinates.length/3; i++){
            let pt = matrix([[pointsCoordinates[3*i]], [pointsCoordinates[3*i+1]], [pointsCoordinates[3*i+2]],[1]]);
            let h_pt = matrix(M.prod(pt));
            pointsCoordinates[3*i    ] = h_pt(0,0);
            pointsCoordinates[3*i + 1] = h_pt(1,0);
            pointsCoordinates[3*i + 2] = h_pt(2,0);
        }
        triangulation = Earcut(pointsCoordinates, holes, 3);
    }

    return triangulation;

}

/**
 * 
 * @param {Array[Array[float]]} border 
 */
function checkAutoIntersection(border){
    let n = border.length;
    let auto_intersects = false;
    for(let i=0; i<n; i++){
        let segment1 = [border[i], border[(i+1)%n]];
        for(let j=i+1; j<n; j++){
            let segment2 = [border[j], border[(j+1)%n]];
            let auto_intersects = intersects(segment1, segment2);
            if(auto_intersects){
                break;
            }
        }
        if(auto_intersects){
            break;
        }
    }
    return auto_intersects;
}

/**
 * 
 * @param {Array[Array[]]} segment1 
 * @param {Array[Array[]]} segment2 
 */
function intersects(segment1, segment2){
    let [[x1,y1,z1],[x2,y2,z2]]=segment1;
    let [[x3,y3,z3],[x4,y4,z4]]=segment2;

    let v1 = Utils.normalize([x2-x1,y2-y1,z2-z1]);
    let v2 = Utils.normalize([x4-x3,y4-y3,z4-z3]);

    let line1 = [[x1,y1,z1], v1];
    let line2 = [[x3,y3,z3], v2];

    let clostestPoint = findClosestPointToNLines(line1, line2);
    
    let p1 = projectPointOnLine(clostestPoint, line1);
    let p2 = projectPointOnLine(clostestPoint, line2);

    if(Utils.norme([p1[0]-p2[0], p1[1]-p2[1],p1[2]-p2[2]])<0.00001){
        return(
            (x1-p1[0])*(x2-p1[0])<0 && (x3-p1[0])*(x4-p1[0])<0 &&
            (y1-p1[1])*(y2-p1[1])<0 && (y3-p1[1])*(y4-p1[1])<0 &&
            (z1-p1[2])*(z2-p1[2])<0 && (z3-p1[2])*(z4-p1[2])<0 
        );
    }
    else{
        return false;
    }
}

 





export {checkAutoIntersection, triangulate, computeShiftTValidity,findClosestPointToNLines,projectPointOnLine,computeIntersectionPoint}