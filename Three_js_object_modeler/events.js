let clicked = false;
let pointer = {
    'x':0,
    'y':0
}

function onMouseDown(event){
    pointer.x = event.clientX ;
    pointer.y = - event.clientY;
    clicked = true;
}

