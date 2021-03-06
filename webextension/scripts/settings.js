// settings.js

// from 'utils.js'
/*   global attachTooltip, isNotExcludedUrl, private_before_state, searchValue */

// from 'popup.js'
/*   global show_all_screens, openContextMenu */

$(initializeSettings)
$('.only').click(validate)
$('#showall').click(selectall)
$('.private').click(validatePrivateMode)
$('#private-mode').click(togglePrivateMode)
// use capture instead of bubbling
document.getElementById('view').addEventListener('click', switchTabWindow, true)
$('input[type="radio"]').click(() => { $(this).prop('checked', true) })
$('input').change(saveOptions)
$('#show_context').change(saveOptions)
$('.back-btn').click(goBack)
switchSetting()
addDocs()

function initializeSettings() {
  chrome.storage.local.get(null, restoreOptions)
}

function restoreOptions(items) {
  /* SPN */
  $('#chk-screenshot').prop('checked', items.spn_screenshot)
  $('#chk-outlinks').prop('checked', items.spn_outlinks)
  /* General */
  $('#private-mode').prop('checked', items.private_mode)
  $('#wm-count-setting').prop('checked', items.wm_count)
  $('#fact-check').prop('checked', items.fact_check)
  $('#resource').prop('checked', items.resource)
  $('#auto-archive').prop('checked', items.auto_archive)
  $('#email-outlinks-setting').prop('checked', items.email_outlinks)
  $('#not-found-popup').prop('checked', items.not_found_popup)
  $('#show-resource-list').prop('checked', items.show_resource_list)
  $(`input[name=tw][value=${items.show_context}]`).prop('checked', true)
  /* Contexts */
  $('#showall').prop('checked', items.showall)
  $('#alexa').prop('checked', items.alexa)
  $('#domaintools').prop('checked', items.domaintools)
  $('#wbmsummary').prop('checked', items.wbmsummary)
  $('#annotations').prop('checked', items.annotations)
  $('#tagcloud').prop('checked', items.tagcloud)
  $('#auto-update-context').prop('checked', items.auto_update_context)
  /* Set 'selected-prior' class to the previous state */
  for (let item of private_before_state) {
    $('#' + item).addClass('selected-prior')
  }
}

function saveOptions() {
  let wm_count = $('#wm-count-setting').prop('checked')
  let resource = $('#resource').prop('checked')
  let fact_check = $('#fact-check').prop('checked')
  chrome.storage.local.set({
    /* SPN */
    spn_outlinks: $('#chk-outlinks').prop('checked'),
    spn_screenshot: $('#chk-screenshot').prop('checked'),
    /* General */
    private_mode: $('#private-mode').prop('checked'),
    wm_count: wm_count,
    fact_check: fact_check,
    resource: resource,
    auto_archive: $('#auto-archive').prop('checked'),
    email_outlinks: $('#email-outlinks-setting').prop('checked'),
    not_found_popup: $('#not-found-popup').prop('checked'),
    show_resource_list: $('#show-resource-list').prop('checked'),
    show_context: $('input[name=tw]:checked').val(),
    /* Contexts */
    showall: $('#showall').prop('checked'),
    alexa: $('#alexa').prop('checked'),
    domaintools: $('#domaintools').prop('checked'),
    wbmsummary: $('#wbmsummary').prop('checked'),
    annotations: $('#annotations').prop('checked'),
    tagcloud: $('#tagcloud').prop('checked'),
    auto_update_context: $('#auto-update-context').prop('checked')
  })
  if (wm_count === false) {
    chrome.runtime.sendMessage({ message: 'clearCountBadge' })
    chrome.runtime.sendMessage({ message: 'clearCountCache' })
  }
  if (resource === false) {
    chrome.runtime.sendMessage({ message: 'clearResource' })
  }
  if (fact_check === false) {
    chrome.runtime.sendMessage({ message: 'clearFactCheck' })
  }
}

function validate() {
  let checkboxes = $('[name="context"]')
  let checkedCount = checkboxes.filter((_index, item) => item.checked === true).length
  if (checkboxes.length === checkedCount) {
    $('#showall').prop('checked', true)
  } else {
    $('#showall').prop('checked', false)
  }
}

function selectall() {
  let checkboxes = $('[name="context"]')
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = $(this).prop('checked')
  }
}

function validatePrivateMode(event) {
  let checkboxes = $('[name="private-include"]')
  let checkedCount = checkboxes.filter((_index, item) => item.checked === true).length
  if (checkedCount > 0) {
    $('#private-mode').prop('checked', false)
  }

  // If the event.taget.checked is true, add class 'selected-prior' to the event.taget, if it is NOT there
  // Else if the event.taget.checked is false, then remove class 'selected-prior'
  if (event.target.checked === true) {
    if (!$(event.target).hasClass('selected-prior')) {
      private_before_state.add(event.target.id)
      $(event.target).addClass('selected-prior')
    }
  } else if (event.target.checked === false) {
    private_before_state.delete(event.target.id)
    $(event.target).removeClass('selected-prior')
  }
  // Set the final previous state
  chrome.storage.local.set({ private_before_state: Array.from(private_before_state) }, () => {})
  hideUiButtons()
}

function togglePrivateMode() {
  let checkboxes = $('.selected-prior.private')
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = !$(this).prop('checked')
  }
  hideUiButtons()
}

function hideUiButtons() {
  // hide wayback machine count label
  if ($('#wm-count-setting').is(':not(:checked)')) {
    $('#wayback-count-label').hide()
  }
  // hide relevant resources buttons
  if ($('#resource').is(':not(:checked)')) {
    $('#borrow_books').hide()
    $('#news_recommend').hide()
    $('#wikibooks').hide()
    $('#doi').hide()
  }
  // change color of fact check button
  if ($('#fact-check').is(':not(:checked)')) {
    $('#fact-check-btn').removeClass('btn-purple')
  }
}

function noneSelected() {
  let checkboxes = $('[name="context"]')
  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) { return false }
  }
  return true
}

function goBack () {
  $('#login-page').hide()
  $('#setting-page').hide()
  $('#popup-page').show()
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let url = searchValue || tabs[0].url
    // checking contexts selection status
    if (noneSelected()) {
      if (!$('#ctxbox').hasClass('flip-inside')) { $('#ctxbox').addClass('flip-inside') }
      /* $('#context-screen').off('click').css({ opacity: 0.5 }) */
      $('#contextBtn').off('click')
      $('#contextBtn').attr('disabled', true)
      if (isNotExcludedUrl(url)) {
        $('#contextTip').click(openContextMenu)
      }
    } else {
      if ($('#ctxbox').hasClass('flip-inside')) {
        if (!isNotExcludedUrl(url)) {
          $('#contextTip').text('URL not supported')
        } else {
          $('#ctxbox').removeClass('flip-inside')
        }
      }
      /* $('#context-screen').off('click').css({ opacity: 1.0 }).on('click', show_all_screens) */
      $('#contextBtn').off('click').on('click', show_all_screens)
      $('#contextBtn').removeAttr('disabled')
    }
  })
}

function switchSetting() {
  if (!$('#general-btn').hasClass('selected')) { $('#general-btn').addClass('selected') }
  $('#context-panel').hide()
  // switching pressed effect of tab button
  $('#general-btn').click(() => {
    $('#context-panel').hide()
    $('#general-panel').show()
    if (!$('#general-btn').hasClass('selected')) { $('#general-btn').addClass('selected') }
    if ($('#context-btn').hasClass('selected')) { $('#context-btn').removeClass('selected') }
  })
  $('#context-btn').click(() => {
    $('#general-panel').hide()
    $('#context-panel').show()
    if (!$('#context-btn').hasClass('selected')) { $('#context-btn').addClass('selected') }
    if ($('#general-btn').hasClass('selected')) { $('#general-btn').removeClass('selected') }
  })
}

function switchTabWindow() { $('input[type="radio"]').not(':checked').prop('checked', true).trigger('change') }

function addDocs() {
  let docs = {
    /* General */
    'private-mode': 'Reduces communications to our servers unless explicit action is taken.',
    'wm-count-setting': 'Display count of snapshots of the current page stored in the Wayback Machine.',
    'fact-check': 'Check to see if the page you are on has been Fact Checked.',
    'resource': 'Provide archived Books, Papers, and TV Clips on relevant pages from Amazon, Wikipedia, and News outlets.',
    'auto-archive': 'Identify and Save URLs that have not previously been saved on the Wayback Machine.',
    'email-outlinks-setting': 'Send an email of results when Outlinks option is selected.',
    'not-found-popup': 'Check if an archived copy is available when an error occurs.',
    'show-resource-list': 'Display a list of resources during Save Page Now.',
    /* Contexts */
    'alexa': 'Displays what Alexa Internet knows about the site you are on.',
    'domaintools': 'Displays what Domaintools.com knows about the site you are on.',
    'wbmsummary': 'Displays what the Wayback Machine knows about the page you are on.',
    'annotations': 'Displays Annotations from Hypothes.is for the page you are on.',
    'tagcloud': 'Creates a Word Cloud from Anchor Text of links archived in the Wayback Machine for the page you are on.',
    'auto-update-context': 'Automatically update context windows when the page they are referencing changes.'
  }
  let labels = $('label')
  for (var i = 0; i < labels.length; i++) {
    let docFor = $(labels[i]).attr('for')
    if (docs[docFor]) {
      let tt = $('<div>').append($('<p>').text(docs[docFor]).attr({ 'class': 'setting-tip' }))[0].outerHTML
      let docBtn = $('<button>').addClass('btn-docs').text('?')
      $(labels[i]).append(attachTooltip(docBtn, tt, 'top'))
    }
  }
}
