// utils/form-handler.js

// Form validation function
function validateForm(formData) {
    const errors = {};
    if (!formData.name) {
        errors.name = 'Name is required';
    }
    if (!formData.email) {
        errors.email = 'Email is required';
    } else if (!/
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(formData.email)) {
        errors.email = 'Email is invalid';
    }
    return errors;
}

// Function to handle form submission
async function handleFormSubmit(formData) {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
        return { success: false, errors };
    }
    try {
        const response = await fetch('https://formsubmit.co/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (!response.ok) {
            throw new Error('Failed to submit form');
        }
        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Export the handler function
module.exports = handleFormSubmit;
