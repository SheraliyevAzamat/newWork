const http = require('http');
const url = require('url');

let phones = [
  { id: 1, name: "iPhone 14", brand: "Apple", price: 1200, stock: 10 },
  { id: 2, name: "Galaxy S23", brand: "Samsung", price: 900, stock: 5 },
  { id: 3, name: "Pixel 7", brand: "Google", price: 800, stock: 8 }
];
let cart = [];

const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    if (pathname === '/phones' && method === 'GET') {
      let filteredPhones = phones;
      const { brand, maxPrice } = parsedUrl.query;

      if (brand) {
        filteredPhones = filteredPhones.filter(phone => phone.brand === brand);
      }
      if (maxPrice) {
        filteredPhones = filteredPhones.filter(phone => phone.price <= parseFloat(maxPrice));
      }

      sendResponse(res, 200, filteredPhones);
    }

    else if (pathname.startsWith('/phones/') && method === 'GET') {
      const id = parseInt(pathname.split('/')[2]);
      const phone = phones.find(phone => phone.id === id);

      if (phone) {
        sendResponse(res, 200, phone);
      } else {
        sendResponse(res, 404, { error: 'Phone not found' });
      }
    }

    else if (pathname === '/phones' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { name, brand, price, stock } = body;

      if (!name || !brand || !price || !stock) {
        sendResponse(res, 400, { error: 'All fields are required' });
        return;
      }

      const newPhone = {
        id: phones.length ? phones[phones.length - 1].id + 1 : 1,
        name,
        brand,
        price,
        stock
      };
      phones.push(newPhone);
      sendResponse(res, 201, newPhone);
    }

    else if (pathname.startsWith('/phones/') && method === 'PUT') {
      const id = parseInt(pathname.split('/')[2]);
      const phone = phones.find(phone => phone.id === id);

      if (!phone) {
        sendResponse(res, 404, { error: 'Phone not found' });
        return;
      }

      const body = await parseRequestBody(req);
      const { name, brand, price, stock } = body;

      if (!name && !brand && !price && !stock) {
        sendResponse(res, 400, { error: 'At least one field must be updated' });
        return;
      }

      if (name) phone.name = name;
      if (brand) phone.brand = brand;
      if (price) phone.price = price;
      if (stock) phone.stock = stock;

      sendResponse(res, 200, phone);
    }

    else if (pathname.startsWith('/phones/') && method === 'DELETE') {
      const id = parseInt(pathname.split('/')[2]);
      const phoneIndex = phones.findIndex(phone => phone.id === id);

      if (phoneIndex === -1) {
        sendResponse(res, 404, { error: 'Phone not found' });
        return;
      }

      const deletedPhone = phones.splice(phoneIndex, 1)[0];
      sendResponse(res, 200, deletedPhone);
    }

    else if (pathname === '/cart' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { phoneId, quantity } = body;

      if (!phoneId || !quantity) {
        sendResponse(res, 400, { error: 'phoneId and quantity are required' });
        return;
      }

      const phone = phones.find(phone => phone.id === phoneId);

      if (!phone) {
        sendResponse(res, 404, { error: 'Phone not found' });
        return;
      }

      if (phone.stock < quantity) {
        sendResponse(res, 400, { error: 'Insufficient stock' });
        return;
      }

      const cartItem = cart.find(item => item.phoneId === phoneId);
      if (cartItem) {
        cartItem.quantity += quantity;
      } else {
        cart.push({ phoneId, quantity });
      }

      phone.stock -= quantity;
      sendResponse(res, 200, cart);
    }

    else if (pathname === '/cart' && method === 'GET') {
      const cartDetails = cart.map(item => {
        const phone = phones.find(phone => phone.id === item.phoneId);
        return {
          phoneId: item.phoneId,
          quantity: item.quantity,
          totalPrice: phone.price * item.quantity
        };
      });

      sendResponse(res, 200, cartDetails);
    }

    else if (pathname === '/cart' && method === 'DELETE') {
      const { phoneId } = parsedUrl.query;

      if (!phoneId) {
        sendResponse(res, 400, { error: 'phoneId is required' });
        return;
      }

      const cartIndex = cart.findIndex(item => item.phoneId === parseInt(phoneId));

      if (cartIndex === -1) {
        sendResponse(res, 404, { error: 'Phone not found in cart' });
        return;
      }

      cart.splice(cartIndex, 1);
      sendResponse(res, 200, cart);
    }

    else if (pathname === '/checkout' && method === 'POST') {
      if (cart.length === 0) {
        sendResponse(res, 400, { error: 'Cart is empty' });
        return;
      }

      let outOfStock = false;

      cart.forEach(item => {
        const phone = phones.find(phone => phone.id === item.phoneId);
        if (phone.stock < item.quantity) {
          outOfStock = true;
        }
      });

      if (outOfStock) {
        sendResponse(res, 400, { error: 'Insufficient stock for some items' });
        return;
      }

      cart.forEach(item => {
        const phone = phones.find(phone => phone.id === item.phoneId);
        phone.stock -= item.quantity;
      });

      cart = [];
      sendResponse(res, 200, { message: 'Order placed successfully' });
    }

    else {
      sendResponse(res, 404, { error: 'Not Found' });
    }
  } catch (error) {
    sendResponse(res, 500, { error: 'Internal Server Error', details: error.message });
  }
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});