import * as THREE from 'three';

class dynamicBufferAttribute extends THREE.BufferAttribute{
    constructor(array, itemSize, normalized=false){
        super(array, itemSize, normalized);
        this.allocatedSize = this.count;
        this.usedSize = this.count;
    }

    increaseSize(){

    }

    addValue(index,x,y,z){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }

        for (var j=this.usedSize; j>index; j--){
            const x1 = this.getX(j-1);
            const y1 = this.getY(j-1);
            const z1 = this.getZ(j-1);
            this.setXYZ(j, x1, y1, z1);
        }
        
        this.setXYZ(i, x, y, z);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

    getXYZ(index){
        return [this.getX(index),this.getY(index),this.getZ(index)];
    }


}

class Float32ArrayDynamicBufferAttribute extends dynamicBufferAttribute{
    constructor(array, itemSize, normalized=false){
        super( array , itemSize, normalized);
    }

    increaseSize(){
        var previousArray = this.array;
        this.array = new Float32Array( 2*this.allocatedSize * this.itemSize );

        for (let i=0; i<previousArray.length; i++){
            this.array[i]=previousArray[i];
            
        }

        
        this.allocatedSize *= 2;
        this.count*=2;
    }

    pushValue(x,y,z){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        this.setXYZ(this.usedSize, x, y, z);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

    

    push2Value(x,y){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }

        
        this.setXY(this.usedSize, x, y);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

}


class UInt16ArrayDynamicBufferAttribute extends dynamicBufferAttribute{
    constructor(array, itemSize, normalized=false){
        super( array , itemSize, normalized);
    }

    increaseSize(){
        var previousArray = this.array;
        this.array = new Uint16Array( 2*this.allocatedSize * this.itemSize );

        for (let i=0; i<this.array.length; i++){
            this.array[i]=previousArray[i];
            
        }

        
        this.allocatedSize *= 2;
        this.count *= 2;
    }

    pushValues(x,y,z){
        this.pushValue(x);
        this.pushValue(y);
        this.pushValue(z);
    }

    pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

    

}

class Int16ArrayDynamicBufferAttribute extends dynamicBufferAttribute{
    constructor(array, itemSize, normalized=false){
        super( array , itemSize, normalized);
    }

    increaseSize(){
        var previousArray = this.array;
        this.array = new Int16Array( 2*this.allocatedSize * this.itemSize );

        for (let i=0; i<this.array.length; i++){
            this.array[i]=previousArray[i];
            
        }

        
        this.allocatedSize *= 2;
        this.count *= 2;
    }

    pushValues(x,y,z){
        this.pushValue(x);
        this.pushValue(y);
        this.pushValue(z);
    }

    pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

    

}


class Int32ArrayDynamicBufferAttribute extends dynamicBufferAttribute{
    constructor(array, itemSize, normalized=false){
        super( array , itemSize, normalized);
    }

    increaseSize(){
        var previousArray = this.array;
        this.array = new Int32Array( 2*this.allocatedSize * this.itemSize );

        for (let i=0; i<this.array.length; i++){
            this.array[i]=previousArray[i];
            
        }

        
        this.allocatedSize *= 2;
        this.count *= 2;
    }

    pushValues(x,y,z){
        this.pushValue(x);
        this.pushValue(y);
        this.pushValue(z);
    }

    pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

    

}


export {Float32ArrayDynamicBufferAttribute, UInt16ArrayDynamicBufferAttribute, Int16ArrayDynamicBufferAttribute, Int32ArrayDynamicBufferAttribute}