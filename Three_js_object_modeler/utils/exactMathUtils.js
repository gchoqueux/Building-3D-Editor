import { ExactNumber as N } from "exactnumber/dist/index.umd";

function max(...values){
    let m = -Infinity;
    if(values.length!=0){
        for(let i=0; i<values.length; i++){
            let value = values[i];
            if(typeof(m)=="number"){
                if(m==Infinity || m ==-Infinity){
                    m = value;
                }
                else{
                    m = N(String(value));
                }
            }
            else{
                if(typeof(value)=="number"){
                    if(value==Infinity){
                        m = value;
                        break;
                    }
                    else if(value!=-Infinity){
                        let exactValue = N(String(value));
                        m = N.max(m, exactValue);
                    }
                }
                else{
                    m = N.max(m, value);
                }
            }
        }
    }
    return m;
}


function min(...values){
    let m = Infinity;
    if(values.length!=0){
        for(let i=0; i<values.length; i++){
            let value = values[i];
            if(typeof(m)=="number"){
                if(m==Infinity || m ==-Infinity){
                    m = value;
                }
                else{
                    m = N(String(value));
                }
            }
            else{
                if(typeof(value)=="number"){
                    if(value==-Infinity){
                        m = value;
                        break;
                    }
                    else if(value!=Infinity){
                        let exactValue = N(String(value));
                        m = N.min(m, exactValue);
                    }
                }
                else{
                    m = N.min(m, value);
                }
            }
        }
    }
    return m;
}

function gt(value1, value2){
    if(typeof(value1)=="number"){
        if(typeof(value2)=="number"){
            return value1>value2;
        }
        else{
            if(value1==Infinity){
                return true;
            }
            else if(value1==-Infinity){
                return false;
            }
            else{
                let exactValue1 = N(String(value1));
                return exactValue1.gt(value2);
            }
        }
    }
    else{
        if(typeof(value2)=="number"){
            if(value2==Infinity){
                return false;
            }
            else if(value2==-Infinity){
                return true;
            }
            else{
                let exactValue2 = N(String(value2));
                return value1.gt(exactValue2);
            }
        }
        else{
            return value1.gt(value2);
        }
    }

}

function gte(value1, value2){
    if(typeof(value1)=="number"){
        if(typeof(value2)=="number"){
            return value1>=value2;
        }
        else{
            if(value1==Infinity){
                return true;
            }
            else if(value1==-Infinity){
                return false;
            }
            else{
                let exactValue1 = N(String(value1));
                return exactValue1.gte(value2);
            }
        }
    }
    else{
        if(typeof(value2)=="number"){
            if(value2==Infinity){
                return false;
            }
            else if(value2==-Infinity){
                return true;
            }
            else{
                let exactValue2 = N(String(value2));
                return value1.gte(exactValue2);
            }
        }
        else{
            return value1.gte(value2);
        }
    }
    
}

function lt(value1, value2){
    if(typeof(value1)=="number"){
        if(typeof(value2)=="number"){
            return value1<value2;
        }
        else{
            if(value1==Infinity){
                return false;
            }
            else if(value1==-Infinity){
                return true;
            }
            else{
                let exactValue1 = N(String(value1));
                return exactValue1.lt(value2);
            }
        }
    }
    else{
        if(typeof(value2)=="number"){
            if(value2==Infinity){
                return true;
            }
            else if(value2==-Infinity){
                return false;
            }
            else{
                let exactValue2 = N(String(value2));
                return value1.lt(exactValue2);
            }
        }
        else{
            return value1.lt(value2);
        }
    }
    
}

function lte(value1, value2){
    if(typeof(value1)=="number"){
        if(typeof(value2)=="number"){
            return value1<=value2;
        }
        else{
            if(value1==Infinity){
                return false;
            }
            else if(value1==-Infinity){
                return true;
            }
            else{
                let exactValue1 = N(String(value1));
                return exactValue1.lte(value2);
            }
        }
    }
    else{
        if(typeof(value2)=="number"){
            if(value2==Infinity){
                return true;
            }
            else if(value2==-Infinity){
                return false;
            }
            else{
                let exactValue2 = N(String(value2));
                return value1.lte(exactValue2);
            }
        }
        else{
            return value1.lte(value2);
        }
    }
}


export {max, min, gt, gte, lt, lte}