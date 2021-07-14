/* eslint-disable */
const axios = require('axios');
import { showAlert } from './alerts';

/*
Next, create an instance of the Stripe object by providing your publishable API key as the first parameter:
*/
const stripe = Stripe(
  'pk_test_51GtBPoGidNu2wPoCIROGpYsPAe7Ts8KyzSpVHqceIMjGcnDBG71T8yzmg10t543dk9GRz9d9GIKJGCszeDmLceiM001G9C23n1',
);

export const bookTour = async (tourId) => {
  try {
    //1) Get checkout session from  API
    const session = await axios(
      `http://127.0.0.1:8000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
