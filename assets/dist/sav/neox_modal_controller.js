
import {coreDashController} from './coreDashController.js';
import * as bootstrap from 'bootstrap';

export default class NeoxModalController extends coreDashController {
    static targets = ["link"];
    
    
    modal(event){
        event.preventDefault();
        event.stopPropagation();
        
        
        const link = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-modal-target="link"]');
        // Find the child element within 'link' that has the 'data-domain' attribute
        const childWithDomain = link.querySelector('[data-domain]');
        const domain = childWithDomain ? childWithDomain.getAttribute('data-domain') : null;
        
        // Initialize stimulus attributes with default values
        this.initializeAttributes(link);
        
        this.showModal({
            title: this.titleValue,
            text: this.textValue,
            icon: this.iconValue,
            // showCancelButton: false,
            confirmButtonText: this.confirmButtonTextValue,
            preConfirm: () => this.fetch({domain}),
   
        });
        // Automatically trigger the confirmation button after the first step
        swal.clickConfirm();
    }
    
    deleteConfirm(event){
        event.preventDefault();
        event.stopPropagation();
        
        // Initialize stimulus attributes with default values
        // this.initializeAttributes();
        const link = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-modal-target="link"]');
        // Initialize stimulus attributes with default values
        this.initializeAttributes(link);
        
        // const button = event.currentTarget;
        // const url = this.urlValue; // Valeur passée via stimulus_action
        // const token = button.closest('form').querySelector('input[name="_token"]').value;
        // const button = this.element.querySelector('button');
        const url = this.urlValue; //button.dataset.url;
        const token = this.element.querySelector('input[name="_token"]').value.toString();
        
        this.showModal({
            title: this.titleValue,
            text: this.textValue,
            icon: 'warning',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            showLoaderOnConfirm: true,
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler',
            preConfirm: () => this.deleteItem(url, token) // Use a function that returns a promise

        });
    }
    
    showModal(options){
        // Fonction générique pour afficher SweetAlert avec options personnalisées
        swal.fire({
            ...options,
            allowOutsideClick: false
        });
    }
    
    async fetch(data){
        const response = await this.fetchForm(data); // Pass a function that returns a promise
        return swal.fire({
            title: this.titleValue,
            html: response,
            showCancelButton: this.showCancelButtonValue,
            confirmButtonText: this.confirmButtonTextValue,
            allowOutsideClick: false,
            preConfirm: () => this.handleFormSubmit()
        });
    }
    
    async handleRequestWithTimeout(requestFunc, timeout = 30000){ // Augmentez le timeout à 30 secondes
        const timeoutId = setTimeout(() => {
            throw new Error("Request timed out");
        }, timeout);
        
        try {
            const result = await this.withTimeout(requestFunc(), timeout);
            return result; // Retourne le résultat de la requête
        } catch(error) {
            swal.fire({
                icon: 'error',
                title: 'Request failed',
                text: error.message
            });
            throw error; // Rejette l'erreur pour le traitement en amont
        } finally {
            clearTimeout(timeoutId); // Arrête le timeout
        }
    }
    
    async handleFormSubmit(){
        return await this.submitForm(); // Pass a function that returns a promise
    }
    
    async deleteItem(url, token){
        const controller = new AbortController(); // Crée un contrôleur d'abort
        const {signal} = controller;
        
        // Définissez un délai d'attente pour la requête
        const timeout = setTimeout(() => {
            controller.abort(); // Annule la requête si le délai est dépassé
        }, 15000); // Délai d'attente de 5 secondes
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'include',
                body: new URLSearchParams({'_token': token}),
                signal // Ajoute le signal d'abort
            });
            
            // Si la réponse n'est pas OK, lance une erreur
            if(!response.ok) throw new Error('Erreur de suppression');
            
            // Affichez le message de succès
            toast.fire({
                icon: "success",
                title: "Supprimé! L'élément a été supprimé avec succès."
            });
            const idElement = this.idElementValue// Do something with idElement
            if(idElement === "element"){
                // Handle the case where idElement is null meaning that we dont have to render any !! maybe is Mercure "broadcast" ???🦖
                console.log('idElement is null');
                return;
            }
            
            if(this.#isRelativeUrl(idElement)){
                // If the URL is valid, we execute a turbo.visit to refresh the page
                console.log('L\'élément est une URL:', idElement);
                Turbo.visit(idElement)
            } else {
                // If it's not a URL, treat it like a normal identifier
                const id = idElement.split('@')[ 1 ]; // Extract the id
                // const id = this.idElementValue.split('@')[ 1 ];
                const component = document.getElementById(idElement).__component; // Get the parent div
                // or call an action
                component.action('refresh', {'query': id});
                // then, trigger a re-render to get the fresh HTML
                // component.render();
                console.log('L\'élément n\'est pas une URL, l\'id est:', id);
            }
            
        } catch(error) {
            if(error.name === 'AbortError'){
                swal.fire('Erreur', 'La requête a expiré. Veuillez réessayer.', 'error');
            } else {
                swal.fire('Erreur', error.message, 'error');
            }
        } finally {
            clearTimeout(timeout); // Efface le délai d'attente
        }
    }
    
    async activateFirstSlide(event){
        
        const link = event.currentTarget;
        // const link = event.target.closest('[data-xorgxx--neox-dashboard-bundle--neox-modal-target="link"]');
        const id = link.dataset.carousel;
        const idt = link.dataset.id;
        const idClass = link.dataset.class;
        const carouselElement = document.getElementById(`carousel${id}`);
        
        if(carouselElement){
            const carousel = new bootstrap.Carousel(carouselElement);
            carousel.to(0); // Activer la première diapositive (index 0)
            
            try {
                const component = document.getElementById(`live-NeoxDashBoardContent@${idClass}`).__component; // Get the parent div
                // or call an action
                component.action('mode', {'query': idt});
                
                // const element = document.getElementById(`live-NeoxDashBoardContent@${idClass}`); // Get the parent div
                // const component = getComponent(element); // Get the parent div
                // // or call an action
                // component.action('mode', {'query': idt});
                
                
            } catch(error) {
                console.error('Component Live introuvable pour cet élément:', error);
            }
        } else {
            console.warn(`Carousel avec l'ID Carousel${id} introuvable.`);
        }
    }
    
    withTimeout(promise, ms){
        const controller = new AbortController();
        const {signal} = controller;
        
        return Promise.race([
            promise, // Pass the promise directly now
            new Promise((_, reject) =>
                setTimeout(() => {
                    controller.abort();
                    reject(new Error("Request timed out"));
                }, ms)
            )
        ]);
    }
    
    #isRelativeUrl(url){
        // Vérifie si la chaîne commence par "/", "./" ou "../", typiquement des indicateurs d'URL relative
        return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
    
}