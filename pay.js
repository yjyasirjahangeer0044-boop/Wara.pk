const crypto = require('crypto');
const https = require('https');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product_id, product_name, amount } = req.body;

  if (!product_id || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '606161';
  const SECURED_KEY = process.env.PAYFAST_SECURED_KEY;
  const STORE_NAME = 'WARA Empowering Women';
  const basketId = product_id + '-' + Date.now();
  const orderDate = new Date().toISOString().slice(0, 10);
  const txnAmt = String(Math.round(parseFloat(amount) * 100));

  // Step 1: Get Access Token from PayFast
  const tokenData = JSON.stringify({
    MERCHANT_ID: MERCHANT_ID,
    SECURED_KEY: SECURED_KEY,
    TXNAMT: txnAmt,
    BASKET_ID: basketId,
    ORDER_DATE: orderDate,
    TXNDESC: product_name,
    PROCCODE: '00',
    MERCHANT_NAME: STORE_NAME,
    CUSTOMER_EMAIL_ADDRESS: 'wara.official.team@gmail.com',
    SUCCESS_URL: 'https://wara.pk/?payment=success',
    FAILURE_URL: 'https://wara.pk/?payment=failed',
    CHECKOUT_URL: 'https://wara.pk'
  });

  try {
    const token = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'ipg1.apps.net.pk',
        path: '/Ecommerce/api/Transaction/GetAccessToken',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(tokenData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse PayFast response'));
          }
        });
      });

      request.on('error', reject);
      request.write(tokenData);
      request.end();
    });

    if (token.ACCESS_TOKEN) {
      // Step 2: Redirect to PayFast checkout
      const checkoutUrl = `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction?MERCHANT_ID=${MERCHANT_ID}&TOKEN=${token.ACCESS_TOKEN}&TXNAMT=${txnAmt}&CUSTOMER_MOBILE_NO=&CUSTOMER_EMAIL_ADDRESS=wara.official.team@gmail.com&SIGNATURE=&VERSION=2.0&TXNDESC=${encodeURIComponent(product_name)}&PROCCODE=00&BASKET_ID=${basketId}&ORDER_DATE=${orderDate}&CHECKOUT_URL=https://wara.pk&SUCCESS_URL=https://wara.pk/?payment=success&FAILURE_URL=https://wara.pk/?payment=failed&MERCHANT_NAME=${encodeURIComponent(STORE_NAME)}`;
      
      res.redirect(302, checkoutUrl);
    } else {
      res.status(500).json({ error: 'Could not get payment token', details: token });
    }
  } catch (err) {
    res.status(500).json({ error: 'Payment service error', message: err.message });
  }
};
