---
weight: 1
title: "Volunteer Registration Builder"
description: "How to build a registration form for volunteers."
icon: "favorite"
draft: false
toc: true
---

The registration builder is a tool in EventPilot that allows you to customize what data you want to collect from your volunteers.

<img src="/images/registration-builder.png" alt="Registration builder" style="width: 100%;" />

By default, EventPilot will collect your volunteers' name and email address. You cannot customize this, but you can add additional fields.

## Sections

The registration builder is divided into 3 primary sections. We recommend taking the tour (click the red "Help!
 button in the bottom left corner of the page) to get familiar with the UI.

<img src="/images/registration-builder-annotated.png" alt="Registration builder sections" style="width: 100%;" />

### 1. The Canvas

The canvas, highlighted in green in the image above, is a "preview" of what your registration form will collect and is where you can customize the bahavior and content of the fields.

### 2. The Field Palette

The field palette, highlighted in red in the image above, hosts "primitive" fields that you can add to your registration form. These fields are the most basic building blocks of a registration form.

{{< table "table-responsive" >}}
| Field Type | Description | Example prompt |
| --- | --- | --- |
| Text | A simple, single-line text input that accepts any text, but will strip line breaks. | "What is your favorite color?" |
| Email | An email input that only accepts valid email addresses. *Remember that EventPilot automatically collects the name and email of your volunteers. You can collect additional information, but EventPilot will use the automatic fields to identify your volunteers and send them emails.* | "What is your email address?" |
| Phone | A phone number input that accepts any phone number, including international prefixes, extensions, and other formats. | "What is your phone number?" |
| Short Answer | A multi-line text input that accepts any text. Should be used for fields with longer responses or responses requiring multiple lines. | "What is your address?" |
| Boolean | A switch that allows the user to select "Yes" or "No". | "Have you volunteered before?" |
| Dropdown | A dropdown menu that allows the user to select from a list of preset options and does not allow any custom text. | "What is your favorite sport?" |
{{< /table >}}

### 3. The Template Palette

The template palette, highlighted in blue in the image above, hosts "template" fields that you can add to your registration form. These are just normal fields, but they are pre-populated with default values for common needs.

{{< table "table-responsive" >}}
| Field Type | Description | Example prompt |
| --- | --- | --- |
| T-Shirt Size | A dropdown menu that allows the user to select from a list of t-shirt sizes ranging from XS to XXL | "What is your t-shirt size?" |
| Referral Source | A dropdown menu that allows the user to select from a list of referral sources. | "What is your referral source?" |
{{< /table >}}

If, for example, you have an event with lots of kids volunteering and our preset t-shirt sizes are not enough, you can just drag the t-shirt size field from the template palette to the canvas and add your own options.

## Customizing the fields

Any good form builder needs to allow you to customize the fields that are in the canvas. Different fields have different options, but we will go over all of them here.

#### Label

The label is the text that will be displayed to the user above the input field. This should be a very short description of what this field is for. Examples could include "Your Name", "Phone Number", "Address", "What is your favorite color?", etc.

#### Placeholder

The placeholder is the text that will be displayed inside the input field when the user hasn't entered anything. This is great for an example, like "555-555-5555" for a phone number, or "yellow" for a favorite color. This text will be greyed out, and once the user starts typing, the placeholder will disappear.

#### Description

The description is the text that will be displayed below the label. This can be a longer, multi-line description of what this field is for.

#### Required

This is a switch that determines whether the field is required or not. If a field is required, EventPilot will display a red asterisk next to the field to indicate that it is required and will not allow the form to be submitted unless something is entered in the field.

#### Autocomplete Type

This is a dropdown that allows you to select an autocomplete type. Setting an autocomplete type allows user's browsers to suggest addresses, phone numbers, and other fields. This will make it easier for your users to fill out the form, and will allow EventPilot to better understand your data to give you better insights. Setting a type will not force your users to accept an autocomplete, it will just provide a suggestion.

This is optional and defaults to "Off".

{{< details title="<h5 style='display: inline-block'>Click to see a list of supported autocomplete types</h5>" >}}

{{< table "table-responsive" >}}
| Autocomplete Type | Description | Example |
| --- | --- | --- |
| Off | No autocomplete | *n/a* |
| First line of the street address | First line of the street address | 1234 Main St |
| Second line of the street address | Second line of the street address | Apt. 123 |
| First level of the address | First level of the address, e.g. the county (less commonly used in the US) | Hamilton |
| Second level of the address | Second level of the address, e.g. the city (less commonly used in the US) | Cincinnati |
| Third level of the address | Third level of the address |  |
| Fourth level of the address | Fourth level of the address |  |
| Street Address | Full street address | 1234 Main St, Apt. 123, San Francisco, CA 94102 |
| Country Code | Country code ([ISO 3166](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes)) | US |
| Country Name | Country name | United States |
| Postal Code | Postal code  | 94102 |
| Full Name | Full name | John Doe |
| First Name | First name | John |
| Middle Name | Middle name |  |
| Last Name | Last name | Doe |
| Honorific Prefix | Honorific prefix | Mr., Mrs., Dr., etc. |
| Honorific Suffix | Honorific suffix | Jr., Sr., III, esq, etc. |
| Nickname | Nickname |  |
| Job Title | Job title |  |
| Birthday (full date) | Full birthday | 03/01/1980 |
| Birthday (day) | Birthday | 1 |
| Birthday (month) | Birthday | 3 |
| Birthday (year) | Birthday | 1980 |
| Gender Identity | Gender identity | freeform response |
| Company Name | Company name |  |
| Language | Language |  |
| URL | URL |  |
| Email | Email |  |
| Phone | Phone |  |
| Country code for phone number | The phone number's country country code in [ISO 3166](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes) |  |
| National phone number | The phone number's country prefix | +1 *(US)* |
| Area code for phone number | The phone number's area code | 513 |
| Local phone number | The phone number's local number | 555-5555 |
| Local phone number prefix | The phone number's local number prefix |  |
| Local phone number suffix | The phone number's local number suffix |  |
| Phone number extension | The phone number's extension | x123 |
| IM address | IM address |  |

{{< /table >}}

{{< /details >}}

#### Prompt

Present only on Dropdown fields, this is the text that will be displayed in the button that opens the dropdown menu when there is no value selected. Should not be left blank, commonly values are "Select a value" or "Choose an option" but can be more specific to the field.

#### Options

Present only on Dropdown fields, this is a list of options that will be displayed in the dropdown menu.