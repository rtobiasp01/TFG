class Cart { 
    constructor(user_id, items = []) {
        this.user_id = user_id;
        this.items = items;
    }

    addItem(product_id, quantity, price) {
        const existingItem = this.items.find(item => item.product_id === product_id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({ product_id, quantity, price });
        }
    }

    removeItem(product_id) {
        this.items = this.items.filter(item => item.product_id !== product_id);
    }

    clearCart() {
        this.items = [];
    }

    getTotal() {
        return this.items.reduce((total, item) => total + item.quantity * item.price, 0);
    }
}

module.exports = Cart;