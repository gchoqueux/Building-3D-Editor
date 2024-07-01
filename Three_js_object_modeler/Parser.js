


class Parser{
    constructor(){

    }

    parseString(s){
        
    }

    parse(file){

    }

    loadFile(file){

    }
    
}

class CityJSONParser extends Parser{
    constructor(){
        super();
    }

    parseString(s){
        
    }

    loadFile(file){
        return fetch(file).then(response=>{return response.json();});
    
    }
    
}

export {CityJSONParser}