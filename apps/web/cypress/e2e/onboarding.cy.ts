describe('Onboarding Flow', () => {
  it('guides a new user through profile and first listing setup', () => {
    cy.intercept('PUT', '/api/users/me', { statusCode: 200 });
    cy.intercept('POST', '/api/listings', { statusCode: 201, body: { id: 'listing-1' } });

    cy.visit('/onboarding');
    cy.contains('Welcome to RealEstate AI').should('be.visible');
    cy.contains('button', 'Start').click();

    cy.url().should('include', '/onboarding/profile');
    cy.get('input[placeholder="Full Name"]').type('Test User');
    cy.get('input[placeholder="Company"]').type('RealEstate Testers');
    cy.contains('button', 'Next').click();

    cy.url().should('include', '/onboarding/first-listing');
    cy.get('input[placeholder="Listing Title"]').type('Skyline Loft');
    cy.get('input[placeholder="Price (AED)"]').type('750000');
    cy.contains('button', 'Finish').click();

    cy.url().should('include', '/onboarding/success');
    cy.contains('Setup Complete!').should('be.visible');
    cy.contains('a', 'Go to Dashboard').should('have.attr', 'href', '/dashboard');
  });
});
