/* 
* Names: Danica, Sydney, Nicole, Tamara -->
* I pledge my honor that I have abided by the Stevens Honor System -->
* Exchange for Students Application -->
* Software Design VI 
*/

function searchItems(inputId, containerId) {
    const input = document.getElementById(inputId).value.toLowerCase();
    const items = document.getElementById(containerId).getElementsByClassName('item');
    for (let i = 0; i < items.length; i++) {
        const text = items[i].textContent.toLowerCase();
        items[i].style.display = text.includes(input) ? "block" : "none";
    }
}
