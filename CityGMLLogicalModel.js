import * as gmlGeometry from "./CityGMLGeometricModel.js"

class AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        
        if(lod0MultiSurface.checkValidity()){
            this.lod0Multisurface = lod0MultiSurface;
        }
        else{
            console.error("Lod 0 surface not valid. Thematic surface could not be created.")
        }

        if(lod1MultiSurface.checkValidity()){
            this.lod1Multisurface = lod1MultiSurface;
        }
        else{
            console.error("Lod 1 surface not valid. Thematic surface could not be created.")
        }

        if(lod2MultiSurface.checkValidity()){
            this.lod2Multisurface = lod2MultiSurface;
        }
        else{
            console.error("Lod 2 surface not valid. Thematic surface could not be created.")
        }

        if(lod3MultiSurface.checkValidity()){
            this.lod3Multisurface = lod3MultiSurface;
        }
        else{
            console.error("Lod 3 surface not valid. Thematic surface could not be created.")
        }
        
    }

    getType(){
        return("Abstract");
    }

    checkValidity(){
        if(!lod0MultiSurface.checkValidity()){
            console.error("Lod 0 surface not valid.")
            return false;
        }

        if(!lod1MultiSurface.checkValidity()){
            console.error("Lod 1 surface not valid.")
            return false;
        }

        if(!lod2MultiSurface.checkValidity()){
            console.error("Lod 2 surface not valid.")
            return false;
        }

        if(lod3MultiSurface.checkValidity()){
            console.error("Lod 3 surface not valid.")
            return false;
        }
        return true;
    }

    getLoD(LoD){
        if(LoD==0){
            return this.lod0Multisurface;
        }
        if(LoD==1){
            return this.lod1Multisurface;
        }
        if(LoD==2){
            return this.lod2Multisurface;
        }
        if(LoD==3){
            return this.lod3Multisurface;
        }
        else{
            console.error("Wrong LoD : "+LoD);
            
        }
    }
}

class ClosureSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("Closure");
    }
}

class AbstractConstruction{
    static max_id = 0;
    constructor(surfaces){
        this.surfaces = surfaces;
        this.id = AbstractConstruction.max_id;
        AbstractConstruction.max_id+=1;
    }
    addSurface(surface){
        this.surfaces.push(surface);
    }
}

class AbstractBuilding extends AbstractConstruction{
    constructor(surfaces){
        super(surfaces);
    }
    getBoundary(){
        return null;
    }
}


class BuildingPart extends AbstractBuilding{
    constructor(boundary, minPointId, maxPointId,  minFaceId, maxFaceId){
        super(boundary);
        this.minPointId = minPointId;
        this.maxPointId = maxPointId;
        this.minFaceId  = minFaceId;
        this.maxFaceId  = maxFaceId;
    }
    getBoundary(){
        return this.surfaces;
    }
}

class Building extends AbstractBuilding{
    constructor(buildingParts){
        super([]);
        this.buildingParts = buildingParts
        this.updateMinMaxId();
    }

    updateMinMaxId(){
        let minPointId = Infinity;
        let maxPointId = 0;
        let minFaceId = Infinity;
        let maxFaceId = 0;
        this.buildingParts.forEach(buildingPart=>{
            let localMinPointId = buildingPart.minPointId;
            let localMaxPointId = buildingPart.maxPointId;
            let localMinFaceId = buildingPart.minFaceId;
            let localMaxFaceId = buildingPart.maxFaceId;
            minPointId = Math.min(minPointId, localMinPointId);
            maxPointId = Math.max(maxPointId, localMaxPointId);
            minFaceId = Math.min(minFaceId, localMinFaceId);
            maxFaceId = Math.max(maxFaceId, localMaxFaceId);
        })
        this.minPointId = minPointId;
        this.maxPointId = maxPointId;
        this.minFaceId = minFaceId;
        this.maxFaceId = maxFaceId;
    }

    addBuildingPart(buildingPart){
        this.buildingParts.push(buildingPart);
    }

    getBoundary(){
        let boundaries = [];
        this.buildingParts.forEach(buildingPart=>{
            boundaries = boundaries.concat(buildingPart.getBoundary());
        })
        return boundaries;
    }
}

class RoofSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("Roof");
    }
}

class GroundSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("Ground");
    }
}

class WallSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("Wall");
    }
}

class FloorSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("Floor");
    }
}

class OuterFloorSurface extends AbstractThematicSurface{
    constructor(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface){
        super(lod0MultiSurface, lod1MultiSurface, lod2MultiSurface, lod3MultiSurface);
    }
    getType(){
        return("OuterFloor");
    }
}

export {Building, BuildingPart, ClosureSurface, AbstractConstruction, RoofSurface, GroundSurface, FloorSurface, OuterFloorSurface, WallSurface}