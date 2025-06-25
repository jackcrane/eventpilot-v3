// src/TourManager.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { TourProvider, useTour } from "@reactour/tour";
import { Typography } from "tabler-react-2";

// define all your tours here
const tours = {
  event_home: [
    {
      selector: ".tour__navbar",
      content: (
        <>
          <Typography.H2>Navbar</Typography.H2>
          <Typography.Text>
            This is the navigation bar at the top of the page. It contains links
            to different sections to help you set up your event. This should be
            your go-to place to find different sections of the app.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-back",
      content: (
        <>
          <Typography.H2>Back to events</Typography.H2>
          <Typography.Text>
            This button takes you back to the events page. If you want to pick a
            different event, you can click here to go back to the events listing
            page.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__event-picker",
      content: (
        <>
          <Typography.H2>Event Picker</Typography.H2>
          <Typography.Text>
            Or, if you want to switch events quickly, you can use the event
            picker. Just click this dropdown and select the event you want to
            work on, or even create a new event.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-home",
      content: (
        <>
          <Typography.H2>Event Home</Typography.H2>
          <Typography.Text>
            This button takes you to the event home page. It is the page you are
            on now, and hosts the quick-access needs of your event. View quick
            statistics and graphs, or launch off to other pages from this page.
            It is also where your todo list is!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-volunteers",
      content: (
        <>
          <Typography.H2>Volunteers</Typography.H2>
          <Typography.Text>
            This button takes you to the volunteers page. It is where you can
            manage your volunteers. You can check to see how many registrants
            you have, and you can go in and edit your volunteers' registration
            and view information about them.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-builder",
      content: (
        <>
          <Typography.H2>Registration Builder</Typography.H2>
          <Typography.Text>
            This button takes you to the registration builder. It is where you
            can create and manage your volunteer registration form. Here is
            where you set up what information you want to collect from your
            volunteers.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-jobs",
      content: (
        <>
          <Typography.H2>Jobs & Shift Builder</Typography.H2>
          <Typography.Text>
            This button takes you to the jobs & shift builder. This is where you
            can create locations, jobs, and shifts for your event. Your
            volunteers will need something to do, so this is where you set up
            the schedule that they can register for.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__todo-list",
      content: (
        <>
          <Typography.H2>Todo List</Typography.H2>
          <Typography.Text>
            This is the todo list. We have pre-populated it with some essentials
            to get your event off the ground. If you are ever stumped on what to
            do next, this is a good place to check. Be sure to scroll!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__help",
      content: (
        <>
          <Typography.H2>"I'm stuck!" Button</Typography.H2>
          <Typography.Text>
            If you are on a page where there is a tour or more help available,
            you will see this button. Click it to get a guided tour of the page,
            just like this! In fact, if you want to open this tour again, you
            can click this button.
          </Typography.Text>
        </>
      ),
    },
  ],
  builder: [
    {
      selector: ".tour__form-canvas",
      content: (
        <>
          <Typography.H2>Canvas</Typography.H2>
          <Typography.Text>
            This is the "layout" of your form. It contains all the fields that
            you are currently asking your volunteers for and allows you to
            configure them. This is a drag-and-drop interface, so if you want to
            re-order fields, just pick them up and drag them to their new
            location. Each field is also collapsible, so you can fold it up when
            you aren't working on that field, or open it to see its settings.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-required-fields",
      content: (
        <>
          <Typography.H2>Required Fields</Typography.H2>
          <Typography.Text>
            Some fields are required by EventPilot so we can offer basic default
            functionality. We require you to collect the name and email address
            of your volunteers. You can collect different names or emails if you
            wish, but EventPilot will use these fields to identify your
            volunteers and send them emails.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-palette",
      content: (
        <>
          <Typography.H2>Field Palette</Typography.H2>
          <Typography.Text>
            This is the "palette" of fields that you can add to your form. You
            can drag fields from here to the canvas to add them to your form.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-template-palette",
      content: (
        <>
          <Typography.H2>Template Palette</Typography.H2>
          <Typography.Text>
            This is the "palette" of pre-built fields that you can add to your
            form. You can drag fields from here to the canvas to add them to
            your form. These fields are ready to use and pre-populated, but
            under the hood are just the same fields from the field palette, so
            you can still edit them.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-canvas",
      content: (
        <>
          <Typography.H2>New Field</Typography.H2>
          <Typography.Text>
            The tour just added a new phone number field to your form. We will
            use this to learn about how to configure form fields. Don't worry,
            we will delete it in a few steps!
          </Typography.Text>
        </>
      ),
      action: () => {
        window.EVENTPILOT__INTERNAL_ADD_FIELD();
      },
    },
    {
      selector: ".tour__form-field-focus",
      content: (
        <>
          <Typography.H2>Field</Typography.H2>
          <Typography.Text>
            This is the new field we created. Each field will result in a single
            piece of information from your volunteers. You can configure
            everything about this field.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-preview",
      content: (
        <>
          <Typography.H2>Preview</Typography.H2>
          <Typography.Text>
            This is the preview of the field. It shows you what the field will
            look like in the form. You can see the label, description, and other
            settings here. Don't bother putting anything in here, it's just a
            preview!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-label",
      content: (
        <>
          <Typography.H2>Label</Typography.H2>
          <Typography.Text>
            This is the label for the field. It will be displayed above the
            actual input box and should be the primary descriptor for the field.
            It is also what is used in EventPilot UIs to identify data (think
            tables and graphs). Feel free to change this and see what happens to
            the preview above!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-placeholder",
      content: (
        <>
          <Typography.H2>Placeholder</Typography.H2>
          <Typography.Text>
            This is the placeholder text that will be displayed in the input box
            when the user hasn't entered anything. It is a nice way to give
            users a hint about what kind of information they should enter. Feel
            free to change this and see what happens to the preview above!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-description",
      content: (
        <>
          <Typography.H2>Description</Typography.H2>
          <Typography.Text>
            This is the description of the field. It will be displayed below the
            label and should be a short description of what the field is for.
            This text can be a little longer, so you can expand on what you
            need. Feel free to change this and see what happens to the preview
            above!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-required",
      content: (
        <>
          <Typography.H2>Required</Typography.H2>
          <Typography.Text>
            This is a switch that determines whether the field is required or
            not. If a field is required, EventPilot will display a red asterisk
            next to the field to indicate that it is required and will not allow
            the form to be submitted unless something is entered in the field.
            Feel free to change this and see what happens to the preview above!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-autocomplete",
      content: (
        <>
          <Typography.H2>Autocomplete</Typography.H2>
          <Typography.Text>
            This is a dropdown that allows you to select an autocomplete type.
            Autocomplete types are used to help your users fill out forms more
            easily. EventPilot supports a number of different industry standard
            autocomplete types. If you select an autocomplete type, EventPilot
            will use it to help your users fill out the form. Just because a
            field is set to an autocomplete type does not mean that your users
            will submit the correct data, it just provides a suggestion.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-field-delete",
      content: (
        <>
          <Typography.H2>Delete</Typography.H2>
          <Typography.Text>
            This is a button that allows you to delete the field. You can delete
            fields at any time, but be careful! Deleting a field will remove it
            from the form, so you will need to re-add it if you want to use it
            again.
          </Typography.Text>
        </>
      ),
      actionAfter: () => {
        window.EVENTPILOT__INTERNAL_REMOVE_FIELD();
      },
    },
    {
      selector: ".tour__form-canvas",
      content: (
        <>
          <Typography.H2>Deleted Field</Typography.H2>
          <Typography.Text>
            The phone number field we just created has now been deleted. Time to
            move on!
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__form-save",
      content: (
        <>
          <Typography.H2>Save Form</Typography.H2>
          <Typography.Text>
            This is a button that allows you to save your form. Saving a form is
            permanent and you cannot roll back to an earlier version of your
            form. Be sure to save your work before you leave, though, because
            the content on this page is not saved until you manually save it.
          </Typography.Text>
        </>
      ),
    },
    {
      selector: ".tour__navbar-home",
      content: (
        <>
          <Typography.H2>Home</Typography.H2>
          <Typography.Text>
            This button takes you back to the events page. If you are done on a
            page, you can click this button to go back to your event's homepage.
          </Typography.Text>
        </>
      ),
    },
  ],
};

// 2) context for startTour()
export const TourContext = createContext();

// 3) this controller now takes `current` and fires open in an effect
export const TourController = ({ current, setCurrent, children }) => {
  const { setIsOpen } = useTour();

  // whenever we switch `current`, open the tour
  useEffect(() => {
    if (current) {
      setIsOpen(true);
    }
  }, [current, setIsOpen]);

  const startTour = (name) => {
    if (!tours[name]) {
      console.warn(`Tour "${name}" not found`);
      return;
    }
    setCurrent(name);
  };

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
};

// 4) wrap your app, passing both current and setCurrent
export const TourManager = ({ children }) => {
  const [current, setCurrent] = useState("");

  return (
    <TourProvider
      key={current}
      steps={tours[current]}
      styles={{
        popover: (base) => ({
          ...base,
          margin: 16,
          marginTop: 0,
          textAlign: "left",
          padding: 8,
          paddingTop: 24,
          minWidth: 200,
        }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, top: 8, right: 8 }),
      }}
      className="card"
    >
      <TourController current={current} setCurrent={setCurrent}>
        {children}
      </TourController>
    </TourProvider>
  );
};

// 5) hook for consumers
export const useTourManager = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTourManager must be inside TourManager");
  return ctx;
};
