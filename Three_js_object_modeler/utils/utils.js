import * as THREE from 'three';
import matrix from 'matrix-js';
import { ExactNumber as N } from 'exactnumber/dist/index.umd';
import { pow, acos, abs, sqrt, PI } from 'exactnumber/dist/index.umd';

/**
 * Return the norme of the vector v
 * @param {float[]} v 
 */
function norme(v){
    let s = N(0);
    v.forEach(c=>{
        s=s.add(c.mul(c));
    })
    return N(String(Math.sqrt(s.toNumber())));
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
    let [a1,b1,c1] = v1;
    let [a2,b2,c2] = v2;


    result[0] = b1.mul(c2).sub(c1.mul(b2));
    result[1] = c1.mul(a2).sub(a1.mul(c2));
    result[2] = a1.mul(b2).sub(b1.mul(a2));
    return result;
}

function normalize(v){
    let [a,b,c] = v;
    let length = N(String(Math.sqrt(a.mul(a).add(b.mul(b)).add(c.mul(c)).toNumber())));
    return [a.div(length), b.div(length), c.div(length)];
}

function dotProduct(v1,v2){
    return (v1[0].mul(v2[0]).add(v1[1].mul(v2[1])).add(v1[2].mul(v2[2])));
}

function angle(v1, v2){
    let a = normalize(v1);
    let b = normalize(v2);
    /*let a_frac = [a[0].toFraction(),a[1].toFraction(),a[2].toFraction()];
    let b_frac = [b[0].toFraction(),b[1].toFraction(),b[2].toFraction()];
    let a_num = [a[0].toNumber(),a[1].toNumber(),a[2].toNumber()];
    let b_num = [b[0].toNumber(),b[1].toNumber(),b[2].toNumber()];
    console.log(a_num, b_num);*/
    //console.log(dotProduct(a,b).toNumber());
    return N(acos(dotProduct(a,b).clamp(N(-1),N(1)),6));
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
    
    let [a1,b1,c1,d1]=plan1;
    let [a2,b2,c2,d2]=plan2;

    //To Do : prendre en compte la distance spatiale si l'angle vaut 0

    let n1 = normalize([a1,b1,c1]);
    let n2 = normalize([a2,b2,c2]);

    let alpha = angle(n1,n2);

    return (N.min(alpha, (alpha.sub(PI(10))).abs()));
    

}

function exactV_to_floatV(v){
    let fv = [];
    v.forEach(c=>{
        fv.push(c.toNumber());
    })
    return fv;
}


function distance_Point_Pl(point, plan){
    

    
    let [x,y,z]=point;
    let [a,b,c,d]=plan;
    //console.log(a.toNumber(),b.toNumber(),c.toNumber(),d.toNumber());
    let num = a.mul(x).add(b.mul(y)).add(c.mul(z)).add(d).abs();
    let den = a.mul(a).add(b.mul(b)).add(c.mul(c));
    //den = N(String(Math.sqrt(den.toNumber())))
    let res= num.mul(num).div(den);
    /*if(!den.isZero()){
        res = num.div(den);
    }
    else{
        res = Infinity;
    }*/

    return (res);
    

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

/**
 * 
 * @param {Array} l1 
 * @param {Array} l2 
 * @returns 
 */
function homogeneousMergeWithoutDoubles(l1,l2){
    let res = [];
    
    let [i1,i2]=[0,0];
    let l2_without_l1 = [];
    let l2_union_l1 = [];

    l2.forEach(el=>{
        if(l1.indexOf(el)==-1){
            l2_without_l1.push(el);
        }
        else{
            l2_union_l1.push(el);
        }
    })

    l2 = l2_without_l1.concat(l2_union_l1);




    let l1_without_l2 = [];
    let l1_union_l2 = [];

    l1.forEach(el=>{
        if(l2.indexOf(el)==-1){
            l1_without_l2.push(el);
        }
        else{
            l1_union_l2.push(el);
        }
    })

    l1 = l1_without_l2.concat(l1_union_l2);
    
    while(i1<l1_without_l2.length ||i2<l2_without_l1.length){
        while(i1<l1_without_l2.length&&res.indexOf(l1_without_l2[i1])!=-1){
            i1++;
        }
        if(i1<l1_without_l2.length){
            res.push(l1_without_l2[i1]);
            i1++;
        }

        while(i2<l2_without_l1.length&&res.indexOf(l2_without_l1[i2])!=-1){
            i2++;
        }
        if(i2<l2_without_l1.length){
            res.push(l2_without_l1[i2]);
            i2++;
        }
    }


    res = res.concat(l1_union_l2);
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

function computeCenter_CityJson(cityJsonData){
    let center = new THREE.Vector3();
    
    let coords = new THREE.BufferGeometry();

    let vertices = new Float32Array( cityJsonData.vertices.map( v => [ v[ 0 ], v[ 1 ], v[ 2 ] ] ).flat() ); 

    coords.setAttribute('position', new THREE.BufferAttribute( vertices, 3));

    coords.computeBoundingBox();

    coords.boundingBox.getCenter(center);


    return [center.x, center.y, center.z];
}

function translateThreeObject(threeObj, vector){
    let n = threeObj.geometry.attributes.position.count;
    for(let i=0; i<n; i++){
        let x = threeObj.geometry.attributes.position.getX(i);
        let y = threeObj.geometry.attributes.position.getY(i);
        let z = threeObj.geometry.attributes.position.getZ(i);

        threeObj.geometry.attributes.position.setXYZ(i, x+vector[0], y+vector[1], z+vector[2]);

    }
    threeObj.geometry.attributes.position.needsUpdate = true;
    
}


function translateCityJSONObject(cityJSON_object, vector){
    let n = cityJSON_object.vertices.length;
    for(let i=0; i<n; i++){
        cityJSON_object.vertices[i][0]+=vector[0];
        cityJSON_object.vertices[i][1]+=vector[1];
        cityJSON_object.vertices[i][2]+=vector[2];

    }
    
}

function computeBBOX_CityJson(cityJsonData){

    let coords = new THREE.BufferGeometry();

    let vertices = new Float32Array( cityJsonData.vertices.map( v => [ v[ 0 ], v[ 1 ], v[ 2 ] ] ).flat() ); 

    coords.setAttribute('position', new THREE.BufferAttribute( vertices, 3));

    coords.computeBoundingBox();

    console.log("BBOX : ",coords.boundingBox.min,coords.boundingBox.max);


    return coords.boundingBox;
}



export{homogeneousMergeWithoutDoubles,computeBBOX_CityJson, translateCityJSONObject, translateThreeObject, computeCenter_CityJson, findElement, isSubArray, removeElements, getCommonElts, mergeListsWithoutDoublesV2, mergeListsWithoutDoubles, nbCommonElts, norme, getPlanEquation2, computeIntersection, orientation, min, max, computeDirection, meanVectors, crossProduct, normalize, distance, distance_Tr_Pl, distance_Point_Pl, distance_Tr_Tr, distance_Pl_Pl, getPlanEquation, equals_vec, dotProduct, angle}