import matrix from "matrix-js";
import * as Utils from './utils';
import { normalize } from "three/src/math/MathUtils";


function crossMatrix(v){
    let [x,y,z] = v;
    return[[ 0, -z,  y],
           [ z,  0, -x],
           [-y,  x,  0]];
}

/**
 * 
 * @param  {...float[][]} lines : the lines parameters, defined like this : [[origin coord],[direction vector]] (vector should be normalized)
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

export {findClosestPointToNLines,projectPointOnLine}