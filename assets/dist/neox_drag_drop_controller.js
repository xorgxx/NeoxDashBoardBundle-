import {Controller} from "@hotwired/stimulus";

let DraggedItem = null;

export default class extends Controller {
    static targets = ["item"]; // Cible tous les éléments à déplacer
    
    
    connect(){
        this.bindEvents();
    }
    
    disconnect(){
        this.unbindEvents();
    }
    
    bindEvents(){
        // Liaison des méthodes pour garder le bon contexte
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDrag = this.handleDrag.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleDragEnter = this.handleDragEnter.bind(this);
        
        // Écoute des événements de glisser-déposer
        this.element.addEventListener('dragstart', this.handleDragStart);
        this.element.addEventListener('drag', this.handleDrag);
        this.element.addEventListener('dragend', this.handleDragEnd);
        this.element.addEventListener('dragover', this.handleDragOver);
        this.element.addEventListener('dragleave', this.handleDragLeave);
        this.element.addEventListener('drop', this.handleDrop);
        this.element.addEventListener('dragenter', this.handleDragEnter);
    }
    
    unbindEvents(){
        // Suppression des événements de glisser-déposer
        this.element.removeEventListener('dragstart', this.handleDragStart);
        this.element.removeEventListener('drag', this.handleDrag);
        this.element.removeEventListener('dragend', this.handleDragEnd);
        this.element.removeEventListener('dragover', this.handleDragOver);
        this.element.removeEventListener('dragleave', this.handleDragLeave);
        this.element.removeEventListener('drop', this.handleDrop);
        this.element.removeEventListener('dragenter', this.handleDragEnter);
    }
    
    handleDragStart(event){
        this.DraggedItem = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        if(this.DraggedItem){
            event.dataTransfer.setData("text/plain", this.DraggedItem.dataset.site);
            // "section" | "domain-browser" | "domain-move"
            event.dataTransfer.setData("text/type", this.DraggedItem.dataset.type);
            event.dataTransfer.setData("text/id", this.DraggedItem.dataset.id);
            event.dataTransfer.setData("text/idClass", this.DraggedItem.dataset.idclass);
            this.DraggedItem.classList.add('dragging'); // Added a visual effect during drag
        }
    }
    
    handleDragEnter(event){
        event.preventDefault(); // Nécessaire pour permettre le drop
        // const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        // if(targetElement){
        //     const draggedId = event.dataTransfer.getData("text/id");
        //     if(targetElement.dataset.id !== draggedId){
        //         targetElement.classList.remove('dragging');
        //         targetElement.style.cursor = 'not-allowed';
        //     }
        // }
    }
    
    handleDrag(event){
        event.preventDefault(); // Nécessaire pour permettre le drop
        const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        if(targetElement){
            const draggedId = event.dataTransfer.getData("text/id");
            if(targetElement.dataset.id !== draggedId){
                targetElement.classList.add('drag-hover');
            }
        }
    }
    
    handleDragOver(event){
        event.preventDefault(); // Nécessaire pour permettre le drop
        const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        if(targetElement && targetElement.dataset.type !== "domain-browser" ){
            const draggedId = event.dataTransfer.getData("text/id");
            if(targetElement.dataset.id !== draggedId){
                const cardElement = targetElement.querySelector('.card');
                if (cardElement) {
                    cardElement.classList.add('drag-hover'); // Ajoute la classe à l'élément avec la classe 'card'
                } else {
                    targetElement.classList.add('drag-hover'); // Ajoute la classe à targetElement si 'card' n'est pas trouvé
                }
            }
        }
    }
    
    handleDragLeave(event){
        const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        if(targetElement){
            const cardElement = targetElement.querySelector('.card');
            if (cardElement) {
                cardElement.classList.remove('drag-hover'); // Ajoute la classe à l'élément avec la classe 'card'
            } else {
                targetElement.classList.remove('drag-hover'); // Ajoute la classe à targetElement si 'card' n'est pas trouvé
            }
            targetElement.style.cursor = ''; // Réinitialiser le curseur
        }
    }
    
    handleDragEnd(event){
        const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        if(targetElement){
            const cardElement = targetElement.querySelector('.card');
            if (cardElement) {
                cardElement.classList.remove('dragging', 'drag-hover'); // Ajoute la classe à l'élément avec la classe 'card'
            }
            targetElement.classList.remove('dragging', 'drag-hover'); // Ajoute la classe à targetElement si 'card' n'est pas trouvé
     
            targetElement.style.cursor = ''; // Réinitialiser le curseur
        }
    }
    
    async handleDrop(event){
        event.preventDefault();
        // Get current target data
        const targetElement = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
        
        if(targetElement){
            const loader = document.getElementById('loader');
            const loading = document.getElementById('loading');
            // Afficher le loader et réduire l'opacité

            loading.classList.add('no-select', 'body-loading'); // Add loading styles
            loader.style.display = 'block';
            
            // "section" | "domain-browser" | "domain-move"
            const type = targetElement.dataset.type;
            const targetId = targetElement.dataset.id;
            const targetApi = targetElement.dataset.api;
            const targetIdClass = targetElement.dataset.idclass;
            
            // Get dragged data
            const draggedElement  = this.DraggedItem;
            const draggedId = event.dataTransfer.getData("text/id");
            const draggedIdClass = event.dataTransfer.getData("text/idClass");
            const draggedType = event.dataTransfer.getData("text/type");

  
            /*
             typeTarget + typeDragged = module
             section + section | section + domain-browser | section + domain-move |
             domain-move + domain-move | domain-browser + null
            */
            let action = `${draggedType}->${type}`;
            
            // log for dev ==========
            console.log(`TypeModule: ${action} | Dragged ID: ${draggedId}, Dropped On ID: ${targetId}, Api: ${targetApi}, idClass ${draggedIdClass} = ${targetIdClass}`);
            
            const cardElement = targetElement.querySelector('.card');
            if (cardElement) {
                cardElement.classList.remove('dragging', 'drag-hover'); // Ajoute la classe à l'élément avec la classe 'card'
            }
            targetElement.classList.remove('dragging', 'drag-hover'); // Ajoute la classe à targetElement si 'card' n'est pas trouvé
           
     
            
            // if id different we do
            if(draggedId !== targetId & draggedIdClass === targetIdClass){
                const refreshButton = document.getElementById('refreshClass');
                try {
                    switch(action) {
                        case 'section->section':
                            targetElement.insertAdjacentElement('beforebegin', draggedElement);
                            await this.updateEntity(draggedId, targetId, targetApi);
                            break;

                        case '->domain-browser':
                            // Logic for 'domain-browser' can be added here if needed
                            break;

                        case 'domain-move->domain-move':
                            // Move the dragged element before the target element
                            targetElement.insertAdjacentElement('beforebegin', draggedElement);
                            await this.updateEntity(draggedId, targetId, targetApi);
                            // const refreshButton = document.getElementById('refreshClass');
                            if(refreshButton){
                                refreshButton.click(); // Simulate a button click
                            }
                            break;
                        case 'domain-move->section':
                            // Move the dragged element before the target element
                            //targetElement.insertAdjacentElement('beforebegin', draggedElement);
                            draggedElement.remove();
                            await this.updateEntity(draggedId, targetId, targetApi + "-domain");
                            const id = `live-NeoxDashBoardContent@${draggedIdClass}`; // Suppose que la valeur est au format "live-NeoxDashBoardContent@ID"
                            
                            if(id){
                                const component = document.getElementById(id).__component;
                                if(component){
                                    component.action('refresh', {query: draggedIdClass});
                                } else {
                                    console.warn(`No components found for the item ${id}`);
                                }
                            } else {
                                console.warn(`Invalid ID in ${id}`);
                            }
                            console.log("domain-move->section");
                            break;
                        default:
                            // Optionally handle any other types if needed
                            // await this.updateEntity(draggedId, targetId, targetApi);
                            break;
                    }
                } catch(error) {
                    console.error('Failed to update entity:', error);
                } finally {
                    // Hide the loader and restore body opacity
                    this.cleanUp(targetElement)
                }
            }

            this.cleanUp(targetElement)
        }
    }
    
    
    // handleDrop(event) {
    //     event.preventDefault();
    //
    //     const loader = document.getElementById('loader');
    //     // Afficher le loader et réduire l'opacité
    //     loader.style.display = 'block';
    //     document.body.classList.add('no-select', 'body-loading'); // Add loading styles
    //
    //     // Get dragged data
    //     const draggedElement      = this.DraggedItem;
    //     const draggedId     = event.dataTransfer.getData("text/id")
    //
    //     // Get current target data
    //     const targetElement       = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-drag-drop-target="item"]');
    //
    //     if (targetElement) {
    //         // "section" | "domain-browser" | "domain-move"
    //         const type      = targetElement.dataset.type;
    //         const targetId  = targetElement.dataset.id;
    //         const targetApi = targetElement.dataset.api;
    //         // log for dev ==========
    //         console.log(`Type:  ${type} Dragged ID: ${draggedId}, Dropped On ID: ${targetId}, Api: ${targetApi}`);
    //         // if id deffrent we do !!
    //         if( draggedId !== targetId ){
    //             switch (type) {
    //                 case 'section':
    //                     targetElement.insertAdjacentElement('beforebegin', draggedElement);
    //                     this.updateEntity(draggedId, targetId, targetApi)
    //                     break;
    //
    //                 case 'domain-browser':
    //
    //                     break;
    //
    //                 case 'domain-move':
    //                     // Move the dragged element before the target element
    //                     targetElement.insertAdjacentElement('beforebegin', draggedElement);
    //                     this.updateEntity(draggedId, targetId, targetApi);
    //                     break;
    //
    //                 default:
    //                     // Optionally handle any other types if needed
    //                     break;
    //             }
    //         }
    //
    //     }
    // }
    
    updateCursorStyle(targetElement){
        // Mise à jour du style du curseur en fonction du type d'élément
        const itemType = targetElement.dataset.type;
        switch(itemType) {
            case 'tab':
                targetElement.style.cursor = 'move'; // Curseur pour les onglets
                break;
            case 'domain':
                targetElement.style.cursor = 'copy'; // Curseur pour les domaines
                break;
            default:
                targetElement.style.cursor = 'not-allowed';
                break;
        }
    }
    
    async updateEntity(draggedId, targetId, targetApi){
        try {
            const response = await fetch(targetApi, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({draggedId, targetId})
            });
            
            if(!response.ok){
                throw new Error(`Error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Entity updated:", data);
            return data; // Return data if needed for further processing
        } catch(error) {
            console.error('Error updating entity:', error);
            throw error; // Re-throw the error for handling in the caller
        }
    }
    
    
    // updateEntity(draggedId, targetId, targetApi) {
    //     // Logic to update order via API for tabs
    //     fetch(targetApi, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ draggedId, targetId })
    //     })
    //     .then(response => response.ok ? response.json() : Promise.reject(response.status))
    //     .then(data => console.log("Entity updated:", data))
    //     .catch(error => console.error('Error updating entity:', error));
    // }
    
    cleanUp(){
        // Hide the loader and restore opacity
        const loader = document.getElementById('loader');
        const loading = document.getElementById('loading');
        loader.style.display = 'none';
        loading.classList.remove('no-select', 'body-loading');
    }
}
