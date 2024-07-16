import * as Utils from './utils/utils';


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
        let promise = fetch(file).then(response=>{return response.json();})
        .then(cityJSON=>{
            
            let cityJSONObject = JSON.parse(JSON.stringify(cityJSON));
            console.log(cityJSONObject);
            let centerJSON = Utils.computeCenter_CityJson(cityJSONObject);
            centerJSON[2]*=-1;
            centerJSON[0]*=-1;
            centerJSON[1]*=-1;

            Utils.computeBBOX_CityJson(cityJSONObject);
            Utils.translateCityJSONObject(cityJSONObject, centerJSON);
            Utils.computeBBOX_CityJson(cityJSONObject);


            let cityObjectsValues = Object.values(cityJSONObject.CityObjects);
            let cityJSON_array = [];
            cityObjectsValues.forEach(cityObject=>{
                let [x_min, y_min, z_min, x_max, y_max, z_max]=[0,0,0,0,0,0];
                //console.log(cityObject);
                let objectCityJSON = {
                    CityObjects:{}, 
                    metadata:{
                        geographicalExtent:[]
                    }, 
                    type:"CityJson", 
                    version:cityJSONObject.version,
                    vertices:[]
                }
                objectCityJSON.CityObjects[1]=cityObject;
                let vertexIndexConvertTable = {table:{}, max_id:0};

                objectCityJSON.CityObjects[1].geometry.forEach(geom=>{
                    geom.boundaries.forEach(bound=>{
                        bound.forEach(surf=>{
                            surf.forEach(ring=>{
                                for(let i=0; i<ring.length; i++){
                                    let v_id = ring[i];
                                    if(vertexIndexConvertTable.table[v_id]===undefined){
                                        vertexIndexConvertTable.table[v_id]=vertexIndexConvertTable.max_id;
                                        vertexIndexConvertTable.max_id++;
                                        let coords = cityJSONObject.vertices[v_id];
                                        objectCityJSON.vertices.push(coords);
                                        
                                        x_min = Math.min(x_min,coords[0]);
                                        y_min = Math.min(y_min,coords[1]);
                                        z_min = Math.min(z_min,coords[2]);

                                        x_max = Math.max(x_max,coords[0]);
                                        y_max = Math.max(y_max,coords[1]);
                                        z_max = Math.max(z_max,coords[2]);
                                    }
                                    ring[i] = vertexIndexConvertTable.table[v_id];
                                }
                            })
                        })
                        
                    })
                })
                if(objectCityJSON.vertices.length!=0){
                    objectCityJSON.metadata.geographicalExtent = [x_min, y_min, z_min, x_max, y_max, z_max];
                    cityJSON_array.push(objectCityJSON);
                }
            })
            return cityJSON_array;
        });
        return promise;
    
    }
    
}

export {CityJSONParser}