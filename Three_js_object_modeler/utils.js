import * as THREE from 'three';

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
    return Math.acos(dotProduct(v1,v2));
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

    return (Math.sqrt((a1-a2)*(a1-a2)+(b1-b2)*(b1-b2)+(c1-c2)*(c1-c2)+(d1-d2)*(d1-d2)));
    

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

export{min, max, computeDirection, test, meanVectors, crossProduct, normalize, distance_Tr_Pl, distance_Tr_Tr, distance_Pl_Pl, getPlanEquation, equals_vec}