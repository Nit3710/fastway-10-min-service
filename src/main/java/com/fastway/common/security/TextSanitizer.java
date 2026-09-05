package com.fastway.common.security;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

/**
 * Product text is rendered by mobile/web clients. This deliberately allows plain text only;
 * it removes tags rather than storing executable markup for a later renderer to interpret.
 */
@Component
public class TextSanitizer {
    private final PolicyFactory plainTextPolicy = new HtmlPolicyBuilder().toFactory();

    public String clean(String value) {
        return value == null ? null : plainTextPolicy.sanitize(value).trim();
    }
}
