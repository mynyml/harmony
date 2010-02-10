module("elementmembers");

// We ought to have test coverage for all members of all DOM objects, but
// until then, add test cases here for members as they are created

test("attributes common to all HTML elements", function() {
    expect(4);

    // tests for .innerText
    var mtch = document.getElementById('dl').innerText.match(
        /^\s+See this blog entry for more information.\s+Here are/);
    try{ ok(mtch && mtch.length > 0,
        "dl.innerText returns the correct content");
    }catch(e){print(e);}

    mtch = document.getElementById('sndp').innerText.match(/^Everything insid/);
    try{ ok(mtch && mtch.length > 0,
        "p.innerText returns the correct content");
    }catch(e){print(e);}

    try{ ok(document.getElementById('sndp').innerText = "test text" || true,
        "p.innerText= operates without exception");
    }catch(e){print(e);}

    try{ ok(document.getElementById('sndp').innerText == "test text",
        "p.innerText= changes content of element");
    }catch(e){print(e);}
});

test("select element", function() {
    expect(14);

    var select = document.getElementById('select1');
    equals("select-one", select.type, "Select field's type is select-one by default");

    select = document.getElementById('test_value');
    equals("optionvalue", select.value, "Select field returns its selected option's value as its value");

    // if option2 is selected, unselect option1 (and update select.value)
    select = document.getElementById('test_selecting');
    select.options[2].selected = true;
    ok(select.options[2].selected, "Select's option should be selected");
    ok(!select.options[1].selected, "Previously selected option should be automatically unselected");
    equals("2", select.value, "Select's value should be updated");

    // if option2 is unselected, then select first option on the list (and update select.value)
    select.options[2].selected = false;
    ok(!select.options[2].selected, "Select's option should be unselected");
    ok(!select.options[1].selected, "Previously selected option should stay unselected");
    ok(select.options[0].selected, "First option in the select should be selected");
    equals("0", select.value, "Select's value should be updated");

    // update select's value and options when selectedIndex is changed
    equals(0, select.selectedIndex, "Select's selectedIndex should return the index of selected option");
    select.selectedIndex = 2;
    equals(2, select.selectedIndex, "Select's selectedIndex should be updated");
    equals("2", select.value, "Changing selectedIndex should update select's value");
    ok(!select.options[0].selected, "Changing selectedIndex should unselect currently selected option");
    ok(select.options[2].selected, "Changing selectedIndex should select option at given index");
});
