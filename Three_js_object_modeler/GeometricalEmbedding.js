import { ExactNumber as N } from "exactnumber/dist/index.umd";

class GeometricalEmbedding{
    constructor(){

    }
    transform(faceId, geometricalController){

    }
}

class TrivialEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [a,b,c,d] = geometricalController.faceData.planeEquation[faceId];
        if (d.isZero()){
            d=N('0.000001');
        }
        return ([a.div(d).toNumber(), b.div(d).toNumber(), c.div(d).toNumber()]);
    }
}

class LinearEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [a,b,c,d] = geometricalController.faceData.planeEquation[faceId];
        if(d.lt(N(0))){
            d=d.neg();
            a=a.neg();
            b=b.neg();
            c=c.neg();
        }
        return ([a.mul(d.add(N(1))).toNumber(), b.mul(d.add(N(1))), c.mul(d.add(N(1)))]);
    }
}

class InverseEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [a,b,c,d] = geometricalController.faceData.planeEquation[faceId];
        let l = d.mul(d).div(a.mul(a).add(b.mul(b)).add(c.mul(c)));
        return ([a.mul(l).toNumber(),b.mul(l).toNumber(),c.mul(l).toNumber()]);
    }
}

class CenterEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [x,y,z] = geometricalController.computeFaceCenter(faceId);
        return ([x,y,z]);
    }
}

let embeddings = {"Trivial":new TrivialEmbedding(), "Linear":new LinearEmbedding(),
                  "Inverse":new InverseEmbedding(), "Center":new CenterEmbedding()};


export{embeddings}