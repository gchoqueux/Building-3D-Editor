import * as THREE from 'three';

class DynamicBufferAttribute extends THREE.BufferAttribute{
    constructor(array, itemSize, normalized=false){
        super(array, itemSize, normalized);
        this.allocatedSize = this.count;
        this.usedSize = this.count;
    }

    _increaseSize(){
        this.allocatedSize*=2;
        let new_array = new this.array.constructor(this.allocatedSize*this.itemSize);
        for (let i=0; i<this.usedSize; i++){
            new_array[i] = this.array[i];
        }
        this.array = new_array;
    }

    _decreaseSize(){
        this.allocatedSize/=2;
        let new_array = new this.array.constructor(this.allocatedSize*this.itemSize);
        for (let i=0; i<this.usedSize; i++){
            new_array[i] = this.array[i];
        }
        this.array = new_array;
    }

    removeValue(i){
        if(this.usedSize!=0){
            for(let j=this.itemSize*i; j<this.itemSize*(this.usedSize-1); j++){
                this.array[j]=this.array[j+this.itemSize];
            }
            for(let j=this.itemSize*(this.usedSize-1); j<this.itemSize*this.usedSize;j++){
                this.array[j]=null;
            }
            this.usedSize-=1;
            this.count-=1;
            if(this.usedSize<=this.allocatedSize/2){
                this._decreaseSize();
            }
        }
        
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
        this.count+=1;
        this.needsUpdate = true;
    }

    getXYZ(index){
        return [this.getX(index),this.getY(index),this.getZ(index)];
    }

    getXY(index){
        return [this.getX(index),this.getY(index)];
    }


    set(index, values){
        if(this.itemSize != values.length){
            console.error("item size different to added item size");
        }
        else{
            index *= this.itemSize;
            if ( this.normalized ) {

                x = THREE.MathUtils.normalize( x, this.array );
                y = THREE.MathUtils.normalize( y, this.array );
                z = THREE.MathUtils.normalize( z, this.array );
    
            }

            for(let i=0; i<values.length; i++){
                this.array[ index + i ] = values[i];
            }

		    return this;

        } 
    }


    pushValue(values){
        if(this.itemSize != values.length){
            console.error("item size different to added item size");
        }
        else{
            if (this.usedSize+1>this.allocatedSize){
                this.increaseSize();
            }
            this.set(this.usedSize, values);
    
            this.usedSize += 1;
            this.count+=1;
            this.needsUpdate = true;
        }
    }


}

class Float32ArrayDynamicBufferAttribute extends DynamicBufferAttribute{
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

    

    

    push2Value(x,y){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setXY(this.usedSize, x, y);

        this.usedSize += 1;
        this.needsUpdate = true;
    }

}


class UInt16ArrayDynamicBufferAttribute extends DynamicBufferAttribute{
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

    push2Values(x,y){
        this.pushValue(x);
        this.pushValue(y);
    }

    /*pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }*/

    

}

class Int16ArrayDynamicBufferAttribute extends DynamicBufferAttribute{
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

    /*pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }*/
    push2Values(x,y){
        this.pushValue(x);
        this.pushValue(y);
    }

    

}


class Int32ArrayDynamicBufferAttribute extends DynamicBufferAttribute{
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

    /*pushValue(x){
        if (this.usedSize+1>this.allocatedSize){
            this.increaseSize();
        }
        
        this.setX(this.usedSize, x);

        this.usedSize += 1;
        this.needsUpdate = true;
    }*/

    

}


export {Float32ArrayDynamicBufferAttribute, UInt16ArrayDynamicBufferAttribute, Int16ArrayDynamicBufferAttribute, Int32ArrayDynamicBufferAttribute}