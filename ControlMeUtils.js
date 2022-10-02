$(document).ready(function () {
    $('.ui.dropdown')
        .dropdown();

    renderControlSitesList();

    $('#controlsDetailsTableBody').on('click', '#controlStatus', function () {

        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $(this).text("Disabled");
        }
        else {
            $(this).addClass('active');
            $(this).text("Active");
        }
    });
});

$("#addSiteControl").click(function (event) {

    var controlEntry = {
        targetURL: $("#controlSiteURL").val(),
        basis: $('.dropdown').dropdown('get text')[0],
        hours: $("#controlHours").val(),
        status: true
    }

    add("controlSiteBase", "ControlSiteDB", controlEntry, false, function () {
        renderControlSitesList();
    })

});

function renderControlSitesList() {

    fun = function (results) {

        results.forEach((result, index) => {


            var statusButton = result.status ? '<button class="ui toggle button active" id="controlStatus">Active</button> ' : '<button class="ui toggle button" id="controlStatus">Disabled</button> ';

            var tblRow = '  <tr id="row' + index + '"> <td data-label="DateTime"> ' + statusButton + '  </td>  <td data-label="DateTime">  ' + result.targetURL + '  </td>  <td data-label="Message"> ' + result.basis + ' </td> '
                + '<td data-label="TargetURL"> ' + result.hours + ' </td></tr>'

            $(" #controlsDetailsTableBody ").append(tblRow);


        });

    };

    $(" #controlsDetailsTableBody ").html("");
    getAll("controlSiteBase", "ControlSiteDB", fun);
}