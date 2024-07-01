import * as THREE from 'three';
import matrix from 'matrix-js';

/**
 * Return the norme of the vector v
 * @param {float[]} v 
 */
function norme(v){
    let s = 0;
    v.forEach(c=>{
        s+=c*c;
    })
    return Math.sqrt(s);
}

function min(vec1, vec2){
    var x = Math.min(vec1.x, vec2.x);
    var y = Math.min(vec1.y, vec2.y);
    var z = Math.min(vec1.z, vec2.z);
    return new THREE.Vector3(x, y, z);
}

function max(vec1, vec2){
    var x = Math.max(vec1.x, vec2.x);
    var y = Math.max(vec1.y, vec2.y);
    var z = Math.max(vec1.z, vec2.z);
    return new THREE.Vector3(x, y, z);
}

function computeDirection(controls){
    var ry = controls.getAzimuthalAngle();
    var rx = controls.getPolarAngle();

    return new THREE.Vector3(Math.cos(rx)*Math.sin(ry), Math.sin(rx), Math.cos(rx)*Math.cos(ry));
}

function test(){
    var v1 = new THREE.Vector3();
    console.log(v1);
    var v2 = v1.addScalar(1);
    console.log(v1);
}

function meanVectors(vectorArray){
    if(vectorArray.length == 0){
        return -1;
    }
    else{
        const l = vectorArray.length;
        const n = vectorArray[0].length;
        var m=[];
        for (let i=0;i<n;i++){
            m[i]=0;
        }
        vectorArray.forEach(v => {
            for (let i=0;i<n;i++){
                m[i]+=v[i]/l;
            }
        });
        return m;

    }
}

function crossProduct(v1,v2){
    var result = [0,0,0];
    result[0] = v1[1]*v2[2]-v1[2]*v2[1];
    result[1] = v1[2]*v2[0]-v1[0]*v2[2];
    result[2] = v1[0]*v2[1]-v1[1]*v2[0];
    return result;
}

function normalize(v){
    const length= Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
    return [v[0]/length, v[1]/length, v[2]/length];
}

function dotProduct(v1,v2){
    return (v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2]);
}

function angle(v1, v2){
    let a = normalize(v1);
    let b = normalize(v2);
    return Math.acos(dotProduct(a,b));
}

function distance(p1,p2){
    if(p1.length!=p2.length){
        console.error("Bad length");
    }
    let d2 = 0;
    for(let i=0; i<p1.length; i++){
        d2+=(p1[i]-p2[i])*(p1[i]-p2[i]);
    }
    return(Math.sqrt(d2));
}

function distance_Tr_Tr(triangle1, triangle2){

    var a1,b1,c1,d1,a2,b2,c2,d2;

    [a1, b1, c1, d1] = getPlanEquation(triangle1);
    [a2, b2, c2, d2] = getPlanEquation(triangle2);
    

    return (Math.sqrt((a1-a2)*(a1-a2)+(b1-b2)*(b1-b2)+(c1-c2)*(c1-c2)+(d1-d2)*(d1-d2)));
    


}

function distance_Tr_Pl(triangle1, plan){
    

    var a1,b1,c1,d1,a2,b2,c2,d2;

    [a2,b2,c2,d2]=plan;

    [a1, b1, c1, d1] = getPlanEquation(triangle1);

    return (Math.sqrt((a1-a2)*(a1-a2)+(b1-b2)*(b1-b2)+(c1-c2)*(c1-c2)+(d1-d2)*(d1-d2)));
    

}

function distance_Pl_Pl(plan1, plan2){
    

    var a1,b1,c1,d1,a2,b2,c2,d2;
    
    [a1,b1,c1,d1]=plan1;
    [a2,b2,c2,d2]=plan2;

    //To Do : prendre en compte la distance spatiale si l'angle vaut 0

    let n1 = normalize([a1,b1,c1]);
    let n2 = normalize([a2,b2,c2]);

    let alpha = angle(n1,n2);

    return (Math.min(alpha, Math.abs(alpha-Math.PI)));
    

}


function distance_Point_Pl(point, plan){
    

    
    let [x,y,z]=point;
    let [a,b,c,d]=plan;

    let num = Math.abs(a*x+b*y+c*z+d);
    let den = Math.sqrt(a*a+b*b+c*c);

    return (num/den);
    

}

function getPlanEquation(triangle){
    let v1 = [triangle[0][0]-triangle[2][0],triangle[0][1]-triangle[2][1],triangle[0][2]-triangle[2][2]];
    let v2 = [triangle[1][0]-triangle[2][0],triangle[1][1]-triangle[2][1],triangle[1][2]-triangle[2][2]];

    let n_t = normalize(crossProduct(v1, v2));
    var a,b,c,d;

    [a,b,c]=n_t;

    let p = triangle[0];

    d = -(a*p[0]+b*p[1]+c*p[2]);

    return [a,b,c,d];
}

function equals_vec(v1,v2){
    let same_length = (v1.length==v2.length);
    if (same_length){
        for(let i=0; i<v1.length; i++){
            if(Math.abs(v1[i]-v2[i])>0.0001){
                return false;
            }
        }
    }
    else{
        return false;
    }
    return true;
}

/**
 * return 1 if p1,p2,p3 is oriented in the trigonomometric way,
 * -1 if they are oriented clockwise, and 0 if they are aligned.
 * 
 * @param {float[]} p1 
 * @param {float[]} p2 
 * @param {float[]} p3 
 */
function orientation(p1, p2, p3){
    let M = matrix([p1,p2,p3]);
    M = matrix(M.trans());
    let det = M.det();
    if(det>0){
        return 1;
    }
    else if(det<0){
        return -1;
    }
    else{
        return 0;
    }


}

/**
 * Computes the equation parameters of the plane defined by the vectors v1 & v2, and passing by the point p.
 * 
 * @param {float[]} v1 
 * @param {float[]} v2 
 * @param {float[]} p 
 */
function getPlanEquation2(v1, v2, p){
    let n = crossProduct(v1,v2);
    n = normalize(n);
    let [a,b,c] = n;
    let [x,y,z] = p;
    let d = -(a*x+b*y+c*z);
    return ([a,b,c,d])
}

/**
 * return the intersection point between a line and a plan
 * 
 * @param {float[]} line parameters of the line [u,v,w, x_o, y_o, z_o]
 * @param {float[]} plan parameters of the plane [a,b,c,d]
 */
function computeIntersection(line, plan){
    let [u,v,w,x_o,y_o,z_o]   = line;
    let [a,b,c,d]             = plan;
    let den = a*u+b*v+c*w;
    if(den==0){
        return null;
    }
    else{
        let num = -(a*x_o+b*y_o+c*z_o+d);
        let t = num/den;
        return ([u*t+x_o, v*t+y_o, w*t+z_o]);
    }

}


/**
 * 
 * @param {Array} l1  
 * @param {Array} l2 
 * @returns The number of common elements in the 2 lists
 */
function nbCommonElts(l1,l2){
    let nb=0;
    l1.forEach(e=>{
        if(l2.indexOf(e)!=-1){
            nb+=1;
        }
    })
    return nb;
}


/**
 * 
 * @param {Array} l1  
 * @param {Array} l2 
 * @returns The number of common elements in the 2 lists
 */
function getCommonElts(l1,l2){
    let commonElts=[];
    l1.forEach(e=>{
        if(l2.indexOf(e)!=-1){
            commonElts.push(e);
        }
    })
    return commonElts;
}

/**
 * 
 * @param  {...Array} lists 
 * @returns The result of the merge of all the lists, without doubles
 */
function mergeListsWithoutDoubles(...lists){
    let res = [];
    lists.forEach(l=>{
        l.forEach(e=>{
            if(res.indexOf(e)==-1){
                res.push(e);
            }
        })
    })
    return res;
}

function indexOf(e, l){
    if(e.length){
        let index = -1;
        let j=0;
        l.forEach(e2=>{
            if(index==-1 && e2.length==e.length){
                let equal = true;
                for(let i=0; i<e.length; i++){
                    if(e[i]!=e2[i]){
                        equal = false;
                        break;
                    }
                }
                if(equal){
                    index=j;
                }
            }
            j++;
        })
        return(index);
    }
    else{
        return l.indexOf(e);
    }
}

/**
 * 
 * @param  {...Array} lists 
 * @returns The result of the merge of all the lists, without doubles. Works with List of list
 */
function mergeListsWithoutDoublesV2(...lists){
    let res = [];
    lists.forEach(l=>{
        l.forEach(e=>{
            if(indexOf(e, res)==-1){
                res.push(e);
            }
        })
    })
    return res;
}

/**
 * 
 * @param {Array} list 
 * @param {Array} elts 
 * @returns The list with the elements removed
 */
function removeElements(list, elts){
    let list_copy = [...list];
    elts.forEach(e=>{
        while(list_copy.indexOf(e)!=-1){
            list_copy.splice(list_copy.indexOf(e),1);
        }
    });
    return list_copy;
}

/**
 * 
 * @param {Array} a1
 * @param {Array} a2 
 * @returns Return true if a2 is a sub array of a1.
 */
function isSubArray(a1, a2){
    let result = false;
    for(let i=0; i<=a1.length-a2.length; i++){
        let subArray = true;
        for(let j=0; j<a2.length; j++){
            if(a1[i+j]!=a2[j]){
                subArray = false;
                break;
            }
        }
        if(subArray){
            result = true;
            break;
        }
    }
    return result;
}


/**
 * 
 * @param {Array[Array]} a 
 * @param {Array} e 
 * @returns 
 */
function findElement(a, e){
    let index = -1;
    for(let i=0; i<=a.length; i++){
        if(a[i].length==e.length && nbCommonElts(a[i], e)==e.length){
            index = i;
            break;
        }
    }
    return index;
}



export{ findElement, isSubArray, removeElements, getCommonElts, mergeListsWithoutDoublesV2, mergeListsWithoutDoubles, nbCommonElts, norme, getPlanEquation2, computeIntersection, orientation, min, max, computeDirection, test, meanVectors, crossProduct, normalize, distance, distance_Tr_Pl, distance_Point_Pl, distance_Tr_Tr, distance_Pl_Pl, getPlanEquation, equals_vec, dotProduct, angle}