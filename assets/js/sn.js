$(document).ready(function(){


    $(".inbox").css("color", "white");

    if ($(window).width() >=768 ) {
    $( ".box2" ).mouseenter(function() {
        $( ".inbox" ).animate({
          width: "20vw",
          backgroundColor: "#f0f0eb",
          color: "#424240"
        }, 1500 );
      });
      $( ".box2" ).mouseleave(function() {
        $( ".inbox" ).animate({
          width: "100%",
          backgroundColor: "#f02e2e",
          color: "white"
        }, 1500 ); 
      }); 

        var movementStrength = 25;
        var height = movementStrength / $(window).height();
        var width = movementStrength / $(window).width();
        $("#sec1").mousemove(function(e){
                  var pageX = e.pageX - ($(window).width() / 2);
                  var pageY = e.pageY - ($(window).height() / 2);
                  var newvalueX = width * pageX * -1 - 25;
                  var newvalueY = height * pageY * -4 - 50;
                  $('#sec1').css("background-position", newvalueX+"px     "+newvalueY+"px");
        });
        
    }

    if ($(window).width() <=768 ) {

        $(".cl-nav").click(function(){
            $("#nav").toggle("fast");
        });
        $("li a").click(function(){
            $("#nav").hide("fast");
        });

        var new_col = document.getElementsByClassName("new-col")[0];
        new_col.classList.add("col-3");
        var new_col1 = document.getElementsByClassName("new-col")[1];
        new_col1.classList.add("col-3");
        var new_col2 = document.getElementsByClassName("new-col")[2];
        new_col2.classList.add("col-3");
        var new_col2 = document.getElementsByClassName("new-col")[3];
        new_col2.classList.add("col-3");

    }
});