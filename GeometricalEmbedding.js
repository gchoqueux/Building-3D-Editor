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
        if (d==0){
            d=0.000001;
        }
        return ([a/d, b/d, c/d]);
    }
}

class LinearEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [a,b,c,d] = geometricalController.faceData.planeEquation[faceId];
        if(d<0){
            d*=-1;
            a*=-1;
            b*=-1;
            c*=-1;
        }
        return ([a*(d+1), b*(d+1), c*(d+1)]);
    }
}

class InverseEmbedding extends GeometricalEmbedding{
    constructor(){
        super();
    }
    transform(faceId, geometricalController){
        let [a,b,c,d] = geometricalController.faceData.planeEquation[faceId];
        let l = d*d/(a*a+b*b+c*c);
        return ([a*l,b*l,c*l]);
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