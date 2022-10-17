(function() {
  const container = document.getElementById('proceed_checkout');
  class VisualDividerContainer extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        data:'',
        background:'',
        position:'',
        embededVideo:'',
        iframeSize:'',
        iframeHeight:'',
        emImage:''
      }
    }
    
    componentDidMount() {
      this.getData()
    }
    
    submitorderdata(el) {
      $.get('/cart.js',function(cart){
        let items = cart.items;
        let orderJson = {"order":{"line_items":items,"customer":{"id":customerid},"financial_status":"pending"}};
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: orderJson
        };
        fetch('https://zeclipseinfomedia.com/dotcom/index.php',requestOptions)
        .then((res) => res.json())
        .then((result) => {
          container.after('<p class="alert">Thank You , Your order has been placed Successfully</p>')
          setTimeout(function(){
            window.location.replace('/')
          },5000);
        })
      },'json')
    }
        
    getData() {
      
    }
    
    

    render() {
      return (
        <React.Fragment>
        	<button type="button" id="proceed_checkout" class="btn-new"  onClick={this.submitorderdata}>Proceed to Checkout</button>
        </React.Fragment>
      )
    }    
  }
  ReactDOM.render(<VisualDividerContainer />, container);
})();